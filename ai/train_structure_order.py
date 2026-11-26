"""Learn left-to-right order within distance layers of a relationship diagram."""
import hashlib
import json
from pathlib import Path

import numpy as np
from sklearn.neural_network import MLPRegressor

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "data/layout-supervision.json"
TARGET = ROOT.parent / "src/domain/services/structure-order.json"


def layers(n, links):
    adjacent = [set() for _ in range(n)]
    for a, b in links:
        if a != b:
            adjacent[a].add(b)
            adjacent[b].add(a)
    depth = [-1] * n
    for root in sorted(range(n), key=lambda i: (-len(adjacent[i]), i)):
        if depth[root] >= 0:
            continue
        depth[root] = 0
        queue = [root]
        for node in queue:
            for other in adjacent[node]:
                if depth[other] < 0:
                    depth[other] = depth[node] + 1
                    queue.append(other)
    rows = [[i for i in range(n) if depth[i] == d] for d in range(max(depth) + 1)]
    rank = ranks(rows, n)
    def neighbor_mean(values, i, sign=None):
        members = [j for j in adjacent[i] if sign is None or np.sign(depth[j] - depth[i]) == sign]
        return np.mean([values[j] for j in members]) if members else rank[i]
    near = [neighbor_mean(rank, i) for i in range(n)]
    features = [[rank[i], near[i], neighbor_mean(near, i), neighbor_mean(rank, i, -1),
                 neighbor_mean(rank, i, 0), neighbor_mean(rank, i, 1), len(adjacent[i])/n,
                 depth[i]/max(1, len(rows)-1), len(rows[depth[i]])/n] for i in range(n)]
    return rows, features


def ranks(rows, n):
    result = np.zeros(n)
    for row in rows:
        for k, i in enumerate(row):
            result[i] = (2*k - len(row) + 1) / max(1, len(row)-1)
    return result


def measurements(rows, links):
    n = sum(map(len, rows))
    points = np.zeros((n, 2))
    for y, row in enumerate(rows):
        for x, i in enumerate(row):
            points[i] = [x - (len(row)-1)/2, y]
    a, b = points[links[:, 0]], points[links[:, 1]]
    vectors = b - a
    lengths = (vectors ** 2).sum(axis=1)
    offset = points[None, :, :] - a[:, None, :]
    t = (offset * vectors[:, None, :]).sum(axis=2) / lengths[:, None]
    gap = np.abs(offset - t[:, :, None] * vectors[:, None, :])
    hits = int(((t > 0) & (t < 1) & (gap.max(axis=2) < .25)).sum())
    def side(point):
        delta = point[None, :, :] - a[:, None, :]
        return vectors[:, 0, None] * delta[:, :, 1] - vectors[:, 1, None] * delta[:, :, 0]
    straddles = side(a) * side(b) < 0
    crossings = int(np.triu(straddles & straddles.T, 1).sum())
    return hits, crossings, float(np.sqrt(lengths).sum())


def cost(metrics):
    hits, crossings, length = metrics
    return 4*hits + crossings + .12*length


def teach(rows, links):
    # Local swaps optimize an explicit geometric objective, preserving distance layers.
    rows = [row[:] for row in rows]
    best = cost(measurements(rows, links))
    for _ in range(4):
        improved = False
        for row in rows:
            for i in range(len(row)):
                for j in range(i+1, len(row)):
                    row[i], row[j] = row[j], row[i]
                    candidate = cost(measurements(rows, links))
                    if candidate < best-1e-8:
                        improved, best = True, candidate
                    else:
                        row[i], row[j] = row[j], row[i]
        if not improved:
            break
    return rows


def main():
    graphs = json.loads(SOURCE.read_bytes())
    rng = np.random.default_rng(172)
    train_x, train_y, test = [], [], []
    for graph in graphs:
        n, links = graph["nodes"], np.asarray(graph["edges"])
        for variant in range(3 if graph["split"] == "train" else 1):
            edges = rng.permutation(n)[links] if variant else links
            rows, features = layers(n, edges)
            if graph["split"] == "test":
                test.append((rows, features, edges))
            else:
                train_x.extend(features)
                train_y.extend(ranks(teach(rows, edges), n))
    model = MLPRegressor(hidden_layer_sizes=(20, 12), random_state=172,
                         learning_rate_init=.003, max_iter=250, early_stopping=False,
                         tol=1e-5, n_iter_no_change=12).fit(train_x, train_y)
    TARGET.write_bytes(json.dumps(dict(weights=[w.tolist() for w in model.coefs_],
                                       biases=[b.tolist() for b in model.intercepts_]),
                                  separators=(",", ":")).encode())
    initial, predicted, structural, improved = [], [], [], 0
    for rows, features, links in test:
        scores = model.predict(features)
        candidate = [sorted(row, key=lambda i: (scores[i], i)) for row in rows]
        before, after = measurements(rows, links), measurements(candidate, links)
        accept = cost(after) < cost(before)-1e-8
        initial.append(before)
        predicted.append(after)
        structural.append(after if accept else before)
        improved += int(accept)
    def mean(values):
        return dict(zip(("throughCards", "crossings", "edgeLength"), np.mean(values, axis=0).tolist()))
    rows, features, edges = test[0]
    scores = model.predict(features)
    run = dict(model="9-20-12-1 ReLU layer-order regressor", seed=172,
               sourceTrainGraphs=sum(g["split"]=="train" for g in graphs),
               variantsPerTrainingGraph=3, trainingNodes=len(train_x), testGraphs=len(test),
               testNodes=sum(len(f) for _, f, _ in test), epochs=model.n_iter_,
               means=dict(inputOrder=mean(initial), predictedOrder=mean(predicted), guardedPrediction=mean(structural)),
               improvedGraphs=improved, datasetSHA256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
               modelSHA256=hashlib.sha256(TARGET.read_bytes()).hexdigest(),
               parity=dict(nodes=len(features), edges=edges.tolist(), scores=scores.tolist()),
               limitation="Centerline geometry of unwrapped synthetic distance layers, before card sizing, grouping or elbow routing. No human preference or case-outcome labels.")
    assert improved > 0
    (ROOT/"training/structure-order-run.json").write_bytes(json.dumps(run, indent=2).encode())
    print(json.dumps({k:v for k,v in run.items() if k!="parity"}))


if __name__ == "__main__":
    main()
