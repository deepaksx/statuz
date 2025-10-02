import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Groups } from './pages/Groups';
import { Messages } from './pages/Messages';
import { Reports } from './pages/Reports';
import { Context } from './pages/Context';
import { Settings } from './pages/Settings';
import { Contacts } from './pages/Contacts';
import Projects from './pages/Projects';
import Tasks from './pages/Tasks';
import { AppProvider } from './contexts/AppContext';

function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/context" element={<Context />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default App;