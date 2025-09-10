import React, { useState} from "react"
import Input from "../../Components/Input"
import Button from "../../Components/Button"
import { useNavigate } from "react-router-dom"
const Form = ({
  isSignInPage=true,
}) => {
  const [data, setData] = useState({
    ...(!isSignInPage &&  { username: '' }),
    email: '',
    password: ''
  });
  const navigate = useNavigate();
  const handleSubmit = async(e) => {
    console.log('data :>>', data);
    e.preventDefault();
    const res= await fetch(`http://localhost:8000/api/${isSignInPage ? 'login' : 'register'}`,{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    if (res.status === 400) {
      alert('User Invalid!');
    }else {
    const resData = await res.json();
    if(resData.token) {
      localStorage.setItem('user:token', resData.token);
      localStorage.setItem('user:detail', JSON.stringify(resData.user));
      navigate('/');
    }
  }
  }

return (
  <div className="relative h-screen flex justify-center items-center overflow-hidden bg-gradient-to-r from-indigo-900 via-blue-800 to-indigo-700">
    
    {/* 🔹 Animated Background Text */}
    <h1 className="absolute inset-0 flex items-center justify-center 
                   text-[8rem] md:text-[12rem] font-extrabold tracking-widest
                   text-white opacity-10 animate-floating select-none pointer-events-none ml-20">
      TextuilS💬
    </h1>
     <div className="absolute inset-0 bg-gradient-to-r from-blue-300 via-indigo-300 to-blue-200 animate-pulse blur-3xl opacity-60"></div>

    {/* 🔹 Glassmorphic Form */}
    <div className="relative z-10 w-[500px] h-[600px] flex flex-col rounded-2xl justify-center items-center
                    bg-white/5 backdrop-blur-sm border border-white/30 shadow-2xl">
      <div className="text-5xl font-serif font-extrabold transition-all duration-700 animate-fade-in-up mb-3 text-white drop-shadow-lg">
        Welcome {isSignInPage && 'Back'}
      </div>
      <div className="text-xl font-light font-serif mb-10 animate-fade-in-up text-gray-200">
        {isSignInPage ? 'Sign in to get engaged' : 'Sign up or login to get started'}
      </div>

      <form className="flex flex-col items-center w-full px-6" onSubmit={(e)=>handleSubmit(e)}>
        {!isSignInPage && (
          <Input
            label="Username"
            name="username"
            placeholder="Enter your username"
            className="mb-6"
            value={data.username}
            onChange={e => setData({ ...data, username: e.target.value })}
          />
        )}
        <Input
          label={isSignInPage ? 'Email address or Username' : 'Email address'}
          type="text"
          name="email"
          placeholder={isSignInPage ? 'Enter your email or username' : 'Enter your email'}
          className="mb-6"
          value={data.email}
          onChange={e => setData({ ...data, email: e.target.value })}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          className="mb-6"
          value={data.password}
          onChange={e => setData({ ...data, password: e.target.value })}
        />
        <Button label={isSignInPage ? 'Sign in' : 'Sign up'} type="submit" className="w-1/2" />
      </form>

      <div className="text-sm text-gray-100 mt-4">
        {isSignInPage ? "Didn't Have An Account?" : "Already have an account?"}
        <span
          className="text-blue-800 hover:text-blue-300 text-sm cursor-pointer underline ml-1"
          onClick={() => {
            navigate(`/users/${isSignInPage ? 'sign_up' : 'sign_in'}`);
          }}
        >
          {isSignInPage ? 'Sign up' : 'Sign in'}
        </span>
      </div>
    </div>
  </div>
);

};

export default Form;