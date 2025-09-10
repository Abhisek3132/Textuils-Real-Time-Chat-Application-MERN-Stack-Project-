import React from 'react'

const Input = ({
    label='',
    type='text, password, email',
    username='',
    className='',
    placeholder='',
    value='',
    onChange=()=>{},
    isRequired=true

}) => {
  return (
    <div className="w-1/2">
        <label htmlFor={username} className="block mb-0   text-black dark:text-black">{label}</label>
      <input type={type} name={username} placeholder={placeholder} className={`w-full px-2 py-1 rounded-xl
            text-gray-900 placeholder-gray-400
           focus:outline-none focus:ring-2 focus:ring-blue-500 
           focus:border-blue-500 transition-all duration-200 ${className}`} required={isRequired} value={value} onChange={onChange}/>
    </div>
  )
}

export default Input
