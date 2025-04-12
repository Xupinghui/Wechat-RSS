import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Feeds from './pages/feeds';
import Login from './pages/login';
import Accounts from './pages/accounts';
import { BaseLayout } from './layouts/base';
import { TrpcProvider } from './provider/trpc';
import ThemeProvider from './provider/theme';
import ArticleDetail from './pages/feeds/article';
import Analysis from './pages/analysis';
import AnalysisDetail from './pages/analysis/ai-detail';
import HotList from './pages/hotlist';

function App() {
  return (
    <BrowserRouter basename="/dash">
      <ThemeProvider>
        <TrpcProvider>
          <Routes>
            <Route path="/" element={<BaseLayout />}>
              <Route index element={<Feeds />} />
              <Route path="/feeds/group/:groupId" element={<Feeds />} />
              <Route path="/feeds/article/:articleId" element={<ArticleDetail />} />
              <Route path="/feeds/:id?" element={<Feeds />} />
              <Route path="/hotlist" element={<HotList />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/analysis/ai-detail/:articleId" element={<AnalysisDetail />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/login" element={<Login />} />
            </Route>
          </Routes>
        </TrpcProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
