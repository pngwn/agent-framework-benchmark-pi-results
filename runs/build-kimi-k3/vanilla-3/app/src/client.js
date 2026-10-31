import './styles.css';
import { initHome } from './client/home.js';
import { initPokemonPage } from './client/pokemon.js';

const page = document.body.dataset.page;
if (page === 'home') initHome();
if (page === 'pokemon') initPokemonPage();
