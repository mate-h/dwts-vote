import { error, redirect } from '@sveltejs/kit';
import { isCloud, normalizeCode, roomPreview } from '#lib/server/backend.js';

export async function load({ params, url }) {
	if (!isCloud()) error(404, 'Rooms are only available in the online version');
	const code = normalizeCode(params.room);
	if (!code) error(404, 'Room not found');
	if (code !== params.room) redirect(308, url.pathname.replace('/r/' + params.room, '/r/' + code) + url.search);
	const preview = await roomPreview(code);
	if (!preview) error(404, 'Room not found');
	return { room: code, roomInfo: preview.info, roomTitle: preview.title ?? '' };
}
