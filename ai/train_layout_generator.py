"""Distil a graph spring layout into a small on-device coordinate regressor."""
import hashlib
import json
from pathlib import Path
import numpy as np
from sklearn.neural_network import MLPRegressor

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "data/layout-supervision.json"
TARGET = ROOT.parent / "src/domain/services/layout-generator.json"


def example(graph):
    n = graph["nodes"]
    i = np.arange(n)
    angle = i * 2.399963229728653
    radius = np.sqrt((i + 1) / n)
    seed = np.stack([np.cos(angle) * radius, np.sin(angle) * radius], axis=1)
    adjacent = np.zeros((n, n))
    for a, b in graph["edges"]:
        adjacent[a, b] = adjacent[b, a] = 1
    degree = adjacent.sum(axis=1, keepdims=True)
    neighbor = adjacent @ seed / np.maximum(degree, 1)
    second = adjacent @ neighbor / np.maximum(degree, 1)
    x = np.column_stack((seed, neighbor, second, degree / n, np.full(n, n / 14)))
    p = seed.copy()
    for _ in range(40):
        offset = p[:, None] - p[None, :]
        squared = (offset ** 2).sum(axis=2) + .03
        repulsion = (offset / squared[:, :, None]).sum(axis=1) * (.13 / n)
        spring = (adjacent @ p / np.maximum(degree, 1) - p) * .62
        p += .10 * (repulsion + spring + .37 * (seed - p))
    return x, p


def main():
    graphs = json.loads(SOURCE.read_bytes())
    train = [example(g) for g in graphs if g["split"] == "train"]
    test = [example(g) for g in graphs if g["split"] == "test"]
    x, y = (np.concatenate(v) for v in zip(*train))
    xt, yt = (np.concatenate(v) for v in zip(*test))
    model = MLPRegressor(hidden_layer_sizes=(24, 16), random_state=42, max_iter=400,
                         learning_rate_init=.003, tol=1e-7, n_iter_no_change=20).fit(x, y)
    pred = model.predict(xt)
    mae = float(np.abs(yt - pred).mean())
    baseline = float(np.abs(yt - xt[:, :2]).mean())
    assert np.isfinite(mae) and mae < baseline
    TARGET.write_text(json.dumps(dict(weights=[w.tolist() for w in model.coefs_],
                                      biases=[b.tolist() for b in model.intercepts_])), encoding="utf-8")
    first = next(g for g in graphs if g["split"] == "test")
    run = dict(model="8-24-16-2 ReLU coordinate MLP", seed=42, geometryTeacherIterations=40,
               epochs=model.n_iter_, trainGraphs=len(train), testGraphs=len(test), trainNodes=len(x),
               testNodes=len(xt), normalizedCoordinateMAE=mae, initialPlacementMAE=baseline,
               datasetSHA256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
               modelSHA256=hashlib.sha256(TARGET.read_bytes()).hexdigest(),
               parity=dict(nodes=first["nodes"], edges=first["edges"], firstCoordinate=pred[0].tolist()),
               limitation="Synthetic geometric teacher fidelity; no human design preference or legal accuracy labels.")
    (ROOT / "training/layout-generator-run.json").write_text(json.dumps(run, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in run.items() if k != "parity"}))


if __name__ == "__main__":
    main()
