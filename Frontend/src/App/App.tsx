import{ RouterProvider} from 'react-router-dom'
import { router } from './route.tsx'
function App() {
  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App