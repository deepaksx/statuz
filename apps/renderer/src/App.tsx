import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Groups } from './pages/Groups';
import { Messages } from './pages/Messages';
import { Signals } from './pages/Signals';
import { Context } from './pages/Context';
import { Settings } from './pages/Settings';
import { AppProvider } from './contexts/AppContext';

function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/signals" element={<Signals />} />
          <Route path="/context" element={<Context />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default App;