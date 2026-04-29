import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./presentation/components/Layout";

// Lazy load pages later or define simple stubs for now
import { Home } from "./presentation/pages/Home";
import { CaseList } from "./presentation/pages/CaseList";
import { NewCase } from "./presentation/pages/NewCase";
import { CaseDetail } from "./presentation/pages/CaseDetail";
import { StatementDraft } from "./presentation/pages/StatementDraft";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cases" element={<CaseList />} />
          <Route path="/cases/new" element={<NewCase />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/cases/:id/statement" element={<StatementDraft />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
