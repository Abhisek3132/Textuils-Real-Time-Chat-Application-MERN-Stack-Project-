
const Button = ({
    label='Button',
    type='button',
    className='',
    disabled=false,
}) => {
  return (
    <button type={type}
  className={`mt-3 px-6 py-2 rounded-full bg-gradient-to-r from-blue-500
   to-blue-700 text-white font-semibold shadow-md hover:from-blue-600
    hover:to-blue-800 hover:scale-105 transition-all duration-200 
    flex justify-center items-center gap-2 ${className}`} disabled={disabled}>{label}</button>
  )
}

export default Button
