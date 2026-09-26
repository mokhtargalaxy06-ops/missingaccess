export type User = { id: string; name: string; email: string; role: 'volunteer' | 'reviewer' };
export type RequestItem = {
  id: string; title: string; description: string; language: string; category: string;
  source_text: string; source_url: string; source_label: string; source_kind: string;
  source_arabic: string; source_footnotes: string;
  owner_id: string | null; status: 'open' | 'review' | 'completed'; created_at: string;
  sample: number; contributor_name?: string; audio_id?: string; supporters: number;
};
export type Contribution = { id: string; request_id: string; user_id: string; status: string;
  name: string; note: string; review_note: string; created_at: string; mime: string };
