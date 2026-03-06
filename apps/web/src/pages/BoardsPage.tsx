import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

type Board = { id: string; name: string; shareId: string; updatedAt: string };

export function BoardsPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState('Nouveau board');
  const auth = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get('/boards');
    setBoards(data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="dashboard">
      <header>
        <h2>Mes boards</h2>
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            onClick={async () => {
              await api.post('/boards', { name });
              setName('Nouveau board');
              load();
            }}
          >
            Créer
          </button>
          <button
            onClick={() => {
              auth.logout();
              navigate('/');
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>
      <ul className="board-list">
        {boards.map((board) => (
          <li key={board.id} className="card">
            <input
              value={board.name}
              onChange={async (e) => {
                const nameValue = e.target.value;
                setBoards((prev) => prev.map((b) => (b.id === board.id ? { ...b, name: nameValue } : b)));
                await api.patch(`/boards/${board.id}`, { name: nameValue });
              }}
            />
            <small>Mis à jour: {new Date(board.updatedAt).toLocaleString()}</small>
            <div className="row">
              <Link to={`/boards/${board.id}`}>Ouvrir</Link>
              <a href={`/boards/share/${board.shareId}`} target="_blank" rel="noreferrer">
                Lien de partage
              </a>
              <button
                onClick={async () => {
                  await api.delete(`/boards/${board.id}`);
                  load();
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
