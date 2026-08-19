/**
 * Name pools for generated colleagues. Deliberately international — the
 * generated org spans ten locations, and a directory full of one naming
 * tradition would look like a placeholder rather than a company.
 */

export const FIRST_NAMES: string[] = [
  'Aarav', 'Adaeze', 'Adrian', 'Aisha', 'Akira', 'Alejandra', 'Amara', 'Amelia', 'Anaya', 'Andrei',
  'Aneta', 'Ansel', 'Anouk', 'Arjun', 'Astrid', 'Ayesha', 'Bilal', 'Bruno', 'Camila', 'Cassian',
  'Chidi', 'Clara', 'Damian', 'Daniela', 'Devika', 'Dmitri', 'Elena', 'Eliot', 'Emeka', 'Esther',
  'Fatima', 'Felipe', 'Finn', 'Freya', 'Gabriel', 'Gemma', 'Hana', 'Haruki', 'Ines', 'Isabel',
  'Ivan', 'Jae-won', 'Jasmin', 'Joana', 'Jonas', 'Kabir', 'Kaia', 'Kenji', 'Khalid', 'Kiran',
  'Lars', 'Laila', 'Leo', 'Lina', 'Lucas', 'Mahesh', 'Maja', 'Marco', 'Mariam', 'Mateo',
  'Maya', 'Meera', 'Mikael', 'Nadia', 'Naveen', 'Nia', 'Nikolai', 'Noor', 'Olamide', 'Oliver',
  'Ottoline', 'Paloma', 'Priya', 'Rafael', 'Rania', 'Ravi', 'Rhea', 'Rohan', 'Rosa', 'Ruben',
  'Sana', 'Sasha', 'Seo-yeon', 'Shreya', 'Simone', 'Sofia', 'Soren', 'Tariq', 'Tessa', 'Theo',
  'Thandiwe', 'Tomas', 'Ugo', 'Valeria', 'Vikram', 'Wei', 'Yara', 'Yusuf', 'Zainab', 'Zoya',
];

export const LAST_NAMES: string[] = [
  'Abiodun', 'Achterberg', 'Adeyemi', 'Almeida', 'Andersson', 'Ansari', 'Baptista', 'Bergström', 'Bhatt', 'Blomqvist',
  'Cardoso', 'Chatterjee', 'Chen', 'Correia', 'Costa', 'Dalgaard', 'Deshmukh', 'Duarte', 'Eriksen', 'Farooq',
  'Fernandes', 'Fischer', 'Gagnon', 'Ghosh', 'Gonçalves', 'Haddad', 'Hoffmann', 'Ibrahim', 'Iyer', 'Jansen',
  'Kaur', 'Keller', 'Khan', 'Kimura', 'Kowalski', 'Krishnan', 'Laurent', 'Lindqvist', 'Lombardi', 'Malek',
  'Mensah', 'Moreau', 'Mukherjee', 'Nakamura', 'Navarro', 'Nguyen', 'Nowak', 'Obi', 'Okafor', 'Olsen',
  'Pereira', 'Petrov', 'Pillai', 'Quintero', 'Rahman', 'Ramírez', 'Rao', 'Reddy', 'Ribeiro', 'Rossi',
  'Sandoval', 'Santos', 'Schneider', 'Sharma', 'Silva', 'Singh', 'Sørensen', 'Sousa', 'Subramanian', 'Suzuki',
  'Tanaka', 'Thomsen', 'Torres', 'Tremblay', 'Vasquez', 'Verma', 'Virtanen', 'Wagner', 'Wang', 'Weber',
  'Yamamoto', 'Yilmaz', 'Zhang', 'Ziegler', 'Bakker', 'Novak', 'Marchetti', 'Aguilar', 'Dubois', 'Berger',
];

export const BIO_OPENERS: string[] = [
  'Joined to work on {focus} and stayed for the problems next to it.',
  'Spends most of the week on {focus}; happiest with a whiteboard and a failing test.',
  'Came from a consulting background, now deep in {focus}.',
  'Started in support, moved into {focus} after rebuilding an internal tool nobody asked for.',
  'Long-time {focus} practitioner; writes the docs everyone else copies.',
  'Interested in {focus} and in making the boring parts of it disappear.',
  'Runs the internal guild for {focus}. Mentors two people at any given time.',
  'Second stint at the company. Previously worked on {focus} elsewhere.',
  'Joined from a much larger org and is enjoying being able to change things.',
  'Works on {focus}; keeps a running list of things that should be deleted.',
];

export const CONTRIBUTIONS: string[] = [
  'Tech lead',
  'Contributor',
  'Reviewer',
  'Domain expert',
  'Design lead',
  'Product owner',
  'On-call rotation',
  'Migration owner',
];

export const SENIORITIES: string[] = ['Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Leadership'];

export function seniorityForLevel(level: number): string {
  if (level <= 1) return 'Junior';
  if (level === 2) return 'Mid';
  if (level === 3) return 'Senior';
  if (level === 4) return 'Staff';
  if (level === 5) return 'Principal';
  return 'Leadership';
}
