require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(helmet());
app.use(express.json());


const cors = require('cors');
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please try again later.' }
});
const donorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many registrations from this IP. Please try later.' }
});
app.use('/api/', limiter);


const adminAuth = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Karachi Blood Bank API is running.' });
});

app.get('/api/banks', async (req, res) => {
  try {
    let query = supabase
      .from('blood_banks')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (req.query.area) {
      query = query.ilike('area', `%${req.query.area}%`);
    }

    if (req.query.tag) {
      query = query.contains('tags', [req.query.tag]);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, count: data.length, banks: data });
  } catch (err) {
    console.error('GET /api/banks error:', err);
    res.status(500).json({ error: 'Failed to fetch blood banks.' });
  }
});

app.get('/api/banks/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blood_banks')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Blood bank not found.' });
    }
    res.json({ success: true, bank: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

app.post('/api/donors', donorLimiter, async (req, res) => {
  try {
    const { full_name, phone, email, blood_group, area, age, last_donated, notes } = req.body;

    // Validation
    const validGroups = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
    if (!full_name || !phone || !blood_group) {
      return res.status(400).json({ error: 'Name, phone, and blood group are required.' });
    }
    if (!validGroups.includes(blood_group)) {
      return res.status(400).json({ error: 'Invalid blood group.' });
    }
    if (phone.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid phone number.' });
    }
    if (age && (age < 18 || age > 65)) {
      return res.status(400).json({ error: 'Age must be between 18 and 65.' });
    }

    const { data, error } = await supabase
      .from('donors')
      .insert([{ full_name, phone, email, blood_group, area, age: age || null, last_donated, notes }])
      .select('id, full_name, blood_group, area, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Thank you! You have been registered as a blood donor.',
      donor: data
    });
  } catch (err) {
    console.error('POST /api/donors error:', err);
    res.status(500).json({ error: 'Failed to register donor. Please try again.' });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { bank_id, sender_name, sender_email, blood_group, message } = req.body;

    if (!sender_name || !sender_email || !blood_group) {
      return res.status(400).json({ error: 'Name, email, and blood group are required.' });
    }

    const { data, error } = await supabase
      .from('contact_requests')
      .insert([{ bank_id: bank_id || null, sender_name, sender_email, blood_group, message }])
      .select('id, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Your inquiry has been saved.',
      request_id: data.id
    });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    res.status(500).json({ error: 'Failed to save inquiry.' });
  }
});

app.get('/api/donors/search', async (req, res) => {
  try {
    const { blood_group, area } = req.query;

    if (!blood_group) {
      return res.status(400).json({ error: 'blood_group query param is required.' });
    }

    let query = supabase
      .from('donors')
      .select('id, blood_group, area, created_at') // NO personal info exposed
      .eq('blood_group', blood_group)
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (area) {
      query = query.ilike('area', `%${area}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      count: data.length,
      message: `${data.length} donor(s) found for ${blood_group}.`,
      donors: data
    });
  } catch (err) {
    res.status(500).json({ error: 'Search failed.' });
  }
});

app.get('/api/admin/donors', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, count: data.length, donors: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch donors.' });
  }
});

app.get('/api/admin/contacts', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('contact_requests')
      .select('*, blood_banks(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, count: data.length, requests: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contact requests.' });
  }
});

app.post('/api/admin/banks', adminAuth, async (req, res) => {
  try {
    const { name, area, address, phone, phone_alt, email, timing, tags, services, note, lat, lng } = req.body;

    if (!name || !area || !address || !phone || !timing) {
      return res.status(400).json({ error: 'name, area, address, phone, timing are required.' });
    }

    const { data, error } = await supabase
      .from('blood_banks')
      .insert([{ name, area, address, phone, phone_alt, email, timing, tags: tags || [], services: services || [], note, lat, lng }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, bank: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add blood bank.' });
  }
});

app.patch('/api/admin/banks/:id', adminAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blood_banks')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, bank: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update blood bank.' });
  }
});

app.delete('/api/admin/banks/:id', adminAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('blood_banks')
      .update({ is_active: false })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Blood bank deactivated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate blood bank.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🩸 Karachi Blood Bank API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}\n`);
});
