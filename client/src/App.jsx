import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import StudentList from './pages/StudentList';
import MapView from './pages/MapView';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center px-4">
            <Link to="/" className="text-xl font-bold">
              Sheet Mapper | Student Logistics
            </Link>
          </div>
        </header>
        <main className="container mx-auto py-6 px-4">
          <Routes>
            <Route path="/" element={<StudentList />} />
            <Route path="/map/:id" element={<MapView />} />
            <Route path="/:branch/:route" element={<StudentList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
