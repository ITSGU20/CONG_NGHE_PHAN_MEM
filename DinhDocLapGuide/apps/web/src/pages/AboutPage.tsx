import { useApp } from '../App';
import Header from '../components/Header';

export default function AboutPage() {
  const { tr } = useApp();
  return (
    <div className="page">
      <Header />
      <main className="hero left">
        <h1>{tr('aboutTitle')}</h1>
        <p>{tr('aboutText')}</p>
      </main>
    </div>
  );
}
