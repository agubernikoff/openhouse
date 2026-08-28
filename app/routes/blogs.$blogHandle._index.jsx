import {redirect} from 'react-router';

/**
 * @param {Route.LoaderArgs} args
 */
export async function loader() {
  return redirect('/blogs', 301);
}

/** @typedef {import('./+types/blogs.$blogHandle._index').Route} Route */
