import React from 'react'
import ReactDOM from 'react-dom/client' //permet d'afficher React dans la page HTML
import App from './App.jsx' //change composant principal
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render( //cherche dans la balise dnas le fichier index
  <React.StrictMode>
    <App /> 
  </React.StrictMode>
) //execute toute l'app
