import { createContext } from 'svelte';

// One controller per layout instance: no cross-request SSR state.
export const [getProfile, setProfile] = createContext();
export class ProfileController {
 current = $state(null);
 open(person) { this.current = person; }
 close() { this.current = null; }
}
