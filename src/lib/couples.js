// DWTS Season 34 (fall 2025).
// Episode 2: One-Hit Wonders Night (Sept 23, 2025). Sources: Wikipedia, Hollywood Reporter, TVLine, E!.
// Episode 3: TikTok Night (Sept 30, 2025). Sources: Wikipedia ("listed in the order they performed"), Hollywood Reporter.
// Couples eliminated at the END of an episode stay votable on that episode's ballot.
// Episode 4: Disney Night (Oct 7, 2025). Sources: Wikipedia (performance order), Hollywood Reporter.
// Dance styles are per episode (an unlearned dance each week).
const CAST = {
	affleck: { id: 'affleck', celeb: 'Jen Affleck', pro: 'Jan Ravnik' },
	baldwin: { id: 'baldwin', celeb: 'Hilaria Baldwin', pro: 'Gleb Savchenko' },
	chiles: { id: 'chiles', celeb: 'Jordan Chiles', pro: 'Ezra Sosa' },
	davis: { id: 'davis', celeb: 'Baron Davis', pro: 'Britt Stewart' },
	earle: { id: 'earle', celeb: 'Alix Earle', pro: 'Val Chmerkovskiy' },
	efron: { id: 'efron', celeb: 'Dylan Efron', pro: 'Daniella Karagach' },
	feldman: { id: 'feldman', celeb: 'Corey Feldman', pro: 'Jenna Johnson' },
	fishel: { id: 'fishel', celeb: 'Danielle Fishel', pro: 'Pasha Pashkov' },
	hendrix: { id: 'hendrix', celeb: 'Elaine Hendrix', pro: 'Alan Bersten' },
	hoying: { id: 'hoying', celeb: 'Scott Hoying', pro: 'Rylee Arnold' },
	irwin: { id: 'irwin', celeb: 'Robert Irwin', pro: 'Witney Carson' },
	jauregui: { id: 'jauregui', celeb: 'Lauren Jauregui', pro: 'Brandon Armstrong' },
	leavitt: { id: 'leavitt', celeb: 'Whitney Leavitt', pro: 'Mark Ballas' },
	richter: { id: 'richter', celeb: 'Andy Richter', pro: 'Emma Slater' }
};

function episodeCouples(entries, wentHome = []) {
	const home = new Set(wentHome);
	return entries.map((entry, i) => {
		const [id, dance, song, songFrom] = entry;
		const person = CAST[id];
		if (!person) throw new Error('Unknown couple ' + id);
		return { ...person, order: i + 1, out: false, wentHome: home.has(id), dance, ...(song ? { song, songFrom } : {}) };
	});
}

export const EPISODES = {
	2: {
		id: 2,
		label: 'Season 34 · Episode 2 · One-Hit Wonders Night',
		night: 'One-Hit Wonders Night',
		couples: episodeCouples(
			[
				['earle', 'Jive'],
				['fishel', 'Cha Cha'],
				['richter', 'Tango'],
				['jauregui', 'Foxtrot'],
				['chiles', 'Jive'],
				['feldman', 'Cha Cha'],
				['affleck', 'Quickstep'],
				['irwin', 'Tango'],
				['hendrix', 'Jive'],
				['davis', 'Samba'],
				['leavitt', 'Cha Cha'],
				['baldwin', 'Tango'],
				['efron', 'Samba'],
				['hoying', 'Cha Cha']
			],
			['feldman', 'davis']
		)
	},
	3: {
		id: 3,
		label: 'Season 34 · Episode 3 · TikTok Night',
		night: 'TikTok Night',
		couples: episodeCouples(
			[
				['affleck', 'Cha Cha'],
				['jauregui', 'Cha Cha'],
				['fishel', 'Foxtrot'],
				['chiles', 'Tango'],
				['efron', 'Foxtrot'],
				['hendrix', 'Tango'],
				['leavitt', 'Samba'],
				['hoying', 'Jazz'],
				['baldwin', 'Samba'],
				['richter', 'Foxtrot'],
				['irwin', 'Salsa'],
				['earle', 'Quickstep']
			],
			['jauregui']
		)
	},
	4: {
		id: 4,
		label: 'Season 34 · Episode 4 · Disney Night',
		night: 'Disney Night',
		couples: episodeCouples(
			[
				['efron', 'Quickstep', "Life Is a Highway", "Cars"],
				['fishel', 'Quickstep', "I Wan'na Be Like You", "The Jungle Book"],
				['hoying', 'Salsa', "Bop to the Top", "High School Musical"],
				['earle', 'Viennese Waltz', "Once Upon a Dream", "Maleficent"],
				['baldwin', 'Quickstep', "Cantina Band", "Star Wars"],
				['richter', 'Viennese Waltz', "Le Festin", "Ratatouille"],
				['irwin', 'Cha Cha', "Try Everything", "Zootopia"],
				['hendrix', 'Quickstep', "Space Mountain", "Space Mountain ride"],
				['leavitt', 'Foxtrot', "The Room Where It Happens", "Hamilton"],
				['chiles', 'Quickstep', "Special Spice", "Tiana's Bayou Adventure"],
				['affleck', 'Jazz', "Friend Like Me", "Aladdin"]
			],
			['baldwin']
		)
	}
};

export function getEpisode(id) {
	return EPISODES[Number(id)] ?? null;
}

export function episodeList() {
	return Object.values(EPISODES)
		.sort((a, b) => a.id - b.id)
		.map(({ id, label }) => ({ id, label }));
}

export const SEASON = EPISODES[2].label;
export const couples = EPISODES[2].couples;
