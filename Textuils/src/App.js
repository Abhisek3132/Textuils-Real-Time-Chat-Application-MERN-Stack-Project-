import './App.css';
import Form from './modules/Form';
import Dashboard from './modules/Dashboard';
import {Routes , Route, Navigate} from 'react-router-dom';
const ProtectedRoute = ({ children, auth=false }) => {
  // Replace this with your actual authentication logic
  const isLoggedIn = localStorage.getItem("user:token")!== null||false; // or however you check auth
  if (!isLoggedIn && auth) {
    return <Navigate to={'/users/sign_in'} />;
  }else if(isLoggedIn && ['/users/sign_in', '/users/sign_up'].includes(window.location.pathname)) { 
    console.log('object :>>');
  return <Navigate to={'/'} />;
  }
  return children
};

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute auth={true}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/users/sign_in" element={<ProtectedRoute><Form isSignInPage={true} /></ProtectedRoute>} />
      <Route path="/users/sign_up" element={<ProtectedRoute><Form isSignInPage={false} /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
//  <div className="bg-[#aeceff] h-screen flex justify-center items-center">
    // {/* <Form/> */}
    // <Dashboard />
    // </div>