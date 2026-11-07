import { Link } from 'react-router-dom';
import { useApp } from '../App';
import Header from '../components/Header';

export default function HomePage() {
  const { tr } = useApp();
  return (
    <div className="page">
      <Header />
      <main className="hero">
        <h1>{tr('heroTitle')}</h1>
        <p>{tr('heroText')}</p>
        <Link className="btn primary big" to="/map">{tr('start')}</Link>
      </main>
    </div>
  );
}
