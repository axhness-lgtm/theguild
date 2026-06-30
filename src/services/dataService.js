import { supabase } from './supabase';

// Initial Curated Screenings for The Guild (Visakhapatnam)
export const UPCOMING_SCREENINGS = [
  // FORMULA 1
  {
    id: 'f1-british-2026',
    category: 'f1',
    name: 'BRITISH GRAND PRIX',
    competition: 'FORMULA 1 // SILVERSTONE CIRCUIT',
    date: 'SUN, JUL 05',
    time: '7:30 PM IST',
    venue: 'THE ROOFTOP HANGAR // BEACH ROAD, VIZAG',
    status: 'LIVE SIGNUPS',
    isLive: true,
    atmosphere: 'High-speed heritage screening. Surround F1 V6 turbo acoustic arrays, live telemetry timing screens, and British pub-style refreshment counter.',
    capacity: '100 Members Max',
    hasPackageSelection: true
  },

  // FOOTBALL
  {
    id: 'fb-por-cro-2026',
    category: 'football',
    name: 'PORTUGAL VS CROATIA',
    competition: 'FIFA WORLD CUP // ROUND OF 32',
    date: 'FRI, JUL 03',
    time: '4:30 AM IST',
    venue: 'THE AMPHITHEATER // RUSHIKONDA, VIZAG',
    status: 'LIVE SIGNUPS',
    isLive: true,
    atmosphere: 'High-stakes World Cup knockout screening. Late-night acoustic stadium immersion, terrace seating, and espresso bar open till dawn.',
    capacity: '150 Members Max'
  },
  {
    id: 'fb-arg-cpv-2026',
    category: 'football',
    name: 'ARGENTINA VS CABO VERDE',
    competition: 'FIFA WORLD CUP // ROUND OF 32',
    date: 'SAT, JUL 04',
    time: '3:30 AM IST',
    venue: 'THE STUDIO LOFT // SIRIPURAM',
    status: 'LIVE SIGNUPS',
    isLive: true,
    atmosphere: 'Intense midnight World Cup clash. Synchronized pitch lighting, stadium chant audio feeds, and passionate national team supporters.',
    capacity: '120 Members Max'
  }
];

const LOCAL_STORAGE_KEY = 'guild_interest_submissions_v1';

// Seed initial sample data for the founder dashboard if empty
const INITIAL_SAMPLE_SUBMISSIONS = [
  {
    id: 'sub-101',
    name: 'Arjun Raju',
    phone: '+91 98480 12345',
    instagram: '@arjun.vz',
    sportCategory: 'f1',
    selectedEvent: 'BRITISH GRAND PRIX [QUALIFYING + RACE DAY]',
    packagePreference: 'QUALIFYING + RACE DAY WEEKEND PASS',
    submissionDate: new Date(Date.now() - 3600000 * 14).toISOString(),
    status: 'Pending'
  },
  {
    id: 'sub-102',
    name: 'Sneha Verma',
    phone: '+91 99890 87654',
    instagram: '@snehav_designs',
    sportCategory: 'f1',
    selectedEvent: 'BRITISH GRAND PRIX [RACE DAY ONLY]',
    packagePreference: 'RACE DAY ONLY (SUN, JUL 05)',
    submissionDate: new Date(Date.now() - 3600000 * 26).toISOString(),
    status: 'Contacted'
  },
  {
    id: 'sub-103',
    name: 'Karthik Varma',
    phone: '+91 91234 56789',
    instagram: '@karthik.goal',
    sportCategory: 'football',
    selectedEvent: 'PORTUGAL VS CROATIA',
    packagePreference: 'N/A',
    submissionDate: new Date(Date.now() - 3600000 * 4).toISOString(),
    status: 'Pending'
  },
  {
    id: 'sub-104',
    name: 'Riya Naidu',
    phone: '+91 94400 11223',
    instagram: '@riya_n',
    sportCategory: 'football',
    selectedEvent: 'ARGENTINA VS CABO VERDE',
    packagePreference: 'N/A',
    submissionDate: new Date(Date.now() - 3600000 * 48).toISOString(),
    status: 'Contacted'
  }
];

function getLocalSubmissions() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_SUBMISSIONS));
    return INITIAL_SAMPLE_SUBMISSIONS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_SAMPLE_SUBMISSIONS;
  }
}

function saveLocalSubmissions(submissions) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(submissions));
}

export const dataService = {
  // Get all screenings
  getScreenings: () => UPCOMING_SCREENINGS,

  // Submit new interest form
  submitInterest: async ({ name, phone, instagram, sportCategory, selectedEvent, packagePreference }) => {
    const formattedEventName = packagePreference && packagePreference !== 'N/A'
      ? `${selectedEvent} [${packagePreference === 'QUALIFYING + RACE DAY WEEKEND PASS' ? 'QUALIFYING + RACE' : 'RACE ONLY'}]`
      : selectedEvent;

    const newSubmission = {
      id: 'sub-' + Math.random().toString(36).substring(2, 9),
      name,
      phone,
      instagram: instagram || 'Not provided',
      sportCategory,
      selectedEvent: formattedEventName,
      packagePreference: packagePreference || 'N/A',
      submissionDate: new Date().toISOString(),
      status: 'Pending'
    };

    if (supabase) {
      try {
        const { error } = await supabase
          .from('interest_submissions')
          .insert([
            {
              name: newSubmission.name,
              phone: newSubmission.phone,
              instagram: newSubmission.instagram,
              sport_category: newSubmission.sportCategory,
              selected_event: newSubmission.selectedEvent,
              package_preference: newSubmission.packagePreference,
              status: newSubmission.status
            }
          ]);
        if (error) console.error('Supabase insert notice:', error.message);
      } catch (err) {
        console.warn('Supabase not connected or table missing, using local store.');
      }
    }

    const current = getLocalSubmissions();
    const updated = [newSubmission, ...current];
    saveLocalSubmissions(updated);
    return newSubmission;
  },

  // Founder Dashboard: Get submissions
  getSubmissions: async () => {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('interest_submissions')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map(item => ({
            id: item.id,
            name: item.name,
            phone: item.phone,
            instagram: item.instagram,
            sportCategory: item.sport_category,
            selectedEvent: item.selected_event,
            packagePreference: item.package_preference || 'N/A',
            submissionDate: item.created_at || new Date().toISOString(),
            status: item.status || 'Pending'
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch notice, falling back to local store');
      }
    }
    return getLocalSubmissions();
  },

  // Founder Dashboard: Update status (Mark Contacted / Pending)
  updateStatus: async (id, newStatus) => {
    if (supabase && id.length > 20) {
      try {
        await supabase
          .from('interest_submissions')
          .update({ status: newStatus })
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase update notice');
      }
    }
    const current = getLocalSubmissions();
    const updated = current.map(sub => sub.id === id ? { ...sub, status: newStatus } : sub);
    saveLocalSubmissions(updated);
    return updated;
  },

  // Founder Dashboard: Delete submission
  deleteSubmission: async (id) => {
    if (supabase && id.length > 20) {
      try {
        await supabase
          .from('interest_submissions')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Supabase delete notice');
      }
    }
    const current = getLocalSubmissions();
    const updated = current.filter(sub => sub.id !== id);
    saveLocalSubmissions(updated);
    return updated;
  }
};
