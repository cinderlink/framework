export type Notification = {
	id: string;
	type: string;
	title: string;
	body: string;
	dismissed: boolean;
	createdAt: number;
	read?: boolean;
	link?: string;
	metaData?: Record<string, unknown>;
};
