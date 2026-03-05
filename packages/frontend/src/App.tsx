import { useEngine } from './hooks/useEngine';
import { useCompilation } from './hooks/useCompilation';
import { Layout } from './components/Layout/Layout';
import './styles/global.css';

export function App() {
  const engine = useEngine();
  const { triggerCompile } = useCompilation(engine);

  return <Layout onCompile={triggerCompile} />;
}
