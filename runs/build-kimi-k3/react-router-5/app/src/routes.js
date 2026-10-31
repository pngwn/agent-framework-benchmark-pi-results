import { index, route } from '@react-router/dev/routes';

export default [
  index('./routes/home.jsx'),
  route('pokemon/:name', './routes/pokemon.jsx'),
  route('moves/:name', './routes/move.jsx'),
  route('abilities/:name', './routes/ability.jsx'),
  route('types', './routes/types.jsx'),
  route('types/:name', './routes/type.jsx'),
  route('*', './routes/not-found.jsx'),
];
