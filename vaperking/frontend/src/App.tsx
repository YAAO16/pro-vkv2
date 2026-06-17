import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PermisosProvider } from './context/PermisosContext';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import './App.css';

function App() {
    return (
        <PermisosProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
            </BrowserRouter>
        </PermisosProvider>
    );
}

export default App;