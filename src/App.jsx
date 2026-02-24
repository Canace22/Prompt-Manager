import React from 'react'
import { Routes, Route } from 'react-router-dom'
import PromptList from './pages/PromptList'
import PromptEditor from './pages/PromptEditor'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PromptList />} />
      <Route path="/editor/:id" element={<PromptEditor />} />
    </Routes>
  )
}
