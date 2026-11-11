import { createContext } from 'svelte';

// One controller per layout instance: no cross-request SSR state.
export const [getProfile, setProfile] = createContext();
export class ProfileController {
 current = $state(null);
 roomTitle = $state(null); // room name from the latest room state (null until loaded; '' = unnamed)
 season = $state(null); // season number of the episode on screen (header, and photos/bios are season 34 only)
 open(person) { this.current = person; }
 close() { this.current = null; }
}
