 import React from 'react'
 import { Routes, Route } from 'react-router-dom'
 
 import Landing from './pages/Landing'
  import Login from './pages/Login'
  import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Chatbot from './pages/Chatbot'
import History from './pages/History'
import Map from './pages/Map'
import DataExplorer from './pages/DataExplorer'

const App = () => {
   return (
     <>
        <Routes>
            <Route path='/' element={<Landing/>} />
            <Route path='/login' element={<Login/>} />
            <Route path='/register' element={<Register/>} />
            <Route path='/dashboard' element={<Dashboard/>} />
            <Route path='/chatbot' element={<Chatbot/>} />
            <Route path='/history' element={<History/>} />
            <Route path='/maps' element={<Map/>} />
            <Route path='/data' element={<DataExplorer/>} />
        </Routes>
     </>
   )
 }
 
 export default App 