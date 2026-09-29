import { AppRoutes } from './routes/AppRoutes.jsx';
import { AuthProvider } from './features/auth/AuthProvider.jsx';

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
