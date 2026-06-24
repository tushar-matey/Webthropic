import{createBrowserRouter} from 'react-router-dom'
import { Home } from '../Pages/Home'
import { Builder } from '../Pages/Builder'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  { 
    path: '/Builder',
    element: <Builder />,
  }
])