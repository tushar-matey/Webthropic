import { RouterProvider } from 'react-router-dom';
import { router } from './route.js';
import { AuthProvider } from '../context/AuthContext.js';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;