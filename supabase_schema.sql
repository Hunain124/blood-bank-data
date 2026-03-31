-- =============================================
-- KARACHI BLOOD BANK FINDER - SUPABASE SCHEMA
-- Run this entire file in: Supabase → SQL Editor → New Query
-- =============================================

-- 1. BLOOD BANKS TABLE
CREATE TABLE IF NOT EXISTS blood_banks (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  area          TEXT NOT NULL,
  address       TEXT NOT NULL,
  phone         TEXT NOT NULL,
  phone_alt     TEXT,
  email         TEXT,
  timing        TEXT NOT NULL,
  tags          TEXT[] DEFAULT '{}',
  services      TEXT[] DEFAULT '{}',
  note          TEXT,
  lat           DECIMAL(9,6),
  lng           DECIMAL(9,6),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DONORS TABLE
CREATE TABLE IF NOT EXISTS donors (
  id            SERIAL PRIMARY KEY,
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  blood_group   TEXT NOT NULL CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  area          TEXT,
  age           INTEGER CHECK (age >= 18 AND age <= 65),
  last_donated  TEXT,
  notes         TEXT,
  is_available  BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CONTACT REQUESTS TABLE (from email modal)
CREATE TABLE IF NOT EXISTS contact_requests (
  id            SERIAL PRIMARY KEY,
  bank_id       INTEGER REFERENCES blood_banks(id),
  sender_name   TEXT NOT NULL,
  sender_email  TEXT NOT NULL,
  blood_group   TEXT NOT NULL,
  message       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUTO-UPDATE updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blood_banks_updated_at
  BEFORE UPDATE ON blood_banks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. INDEXES for fast queries
CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_area ON donors(area);
CREATE INDEX IF NOT EXISTS idx_banks_area ON blood_banks(area);
CREATE INDEX IF NOT EXISTS idx_banks_tags ON blood_banks USING gin(tags);

-- 6. ROW LEVEL SECURITY (public read, no public write)
ALTER TABLE blood_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- Allow public to READ blood banks only
CREATE POLICY "Public can read active blood banks"
  ON blood_banks FOR SELECT
  USING (is_active = TRUE);

-- No public read on donors (privacy)
-- API handles all writes using service role key

-- =============================================
-- 7. SEED DATA - All Verified Karachi Blood Banks
-- =============================================

INSERT INTO blood_banks (name, area, address, phone, phone_alt, email, timing, tags, services, note, lat, lng) VALUES

-- HUSAINI BLOOD BANK - HEAD OFFICE
('Husaini Blood Bank — Head Office', 'North Nazimabad', 'Plot ST-02, Qalandaria Chowk, Block T, North Nazimabad, Karachi', '021-111-487-246', '0315-4872464', 'info@husaini.org', 'Open 24 Hours, 7 Days', ARRAY['free','open24'], ARRAY['Thalassemia','Hemophilia','Apheresis','NAT Screening','Blood Components'], 'Main HQ. Founded 1979. 26+ branches across Pakistan. AABB affiliated.', 24.9340, 67.0420),

-- HUSAINI BRANCHES IN KARACHI
('Husaini Blood Bank — Clifton Branch', 'Clifton, Block 2', 'South City Hospital, Opp Bar B.Q Tonight, Bilawal Chowrangi, Block 2, Clifton, Karachi', '021-35292356', NULL, 'info@husaini.org', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Blood Collection','Transfusion','Screening'], 'Located inside South City Hospital premises.', 24.8116, 67.0282),

('Husaini Blood Bank — DHA Phase V', 'DHA Phase V', '10th Commercial Street, Badar Commercial Area, Phase V (Ext), DHA, Karachi', '021-35349784', NULL, 'info@husaini.org', 'Open 24 Hours', ARRAY['open24'], ARRAY['Blood Collection','Transfusion','Lab Tests'], 'DHA branch serving Defence residents.', 24.8069, 67.0645),

('Husaini Blood Bank — North Nazimabad (KDA Chowrangi)', 'North Nazimabad', 'ST-1 Block-F, North Nazimabad, KDA Chowrangi, Karachi', '021-36649866', '021-36670696', 'info@husaini.org', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Blood Collection','Thalassemia','Transfusion'], 'Near KDA Chowrangi North Nazimabad.', 24.9318, 67.0395),

('Husaini Blood Bank — PECHS', 'PECHS', '70-L Block-6, PECHS, Karachi', '021-34530001', '021-34530003', 'info@husaini.org', 'Open 24 Hours', ARRAY['open24'], ARRAY['Blood Collection','Screening','Lab Tests'], 'PECHS branch — central location.', 24.8816, 67.0501),

('Husaini Blood Bank — Gulshan-e-Iqbal', 'Gulshan-e-Iqbal', 'Khan Hospital, Block-5, Gulshan-e-Iqbal, Karachi', '021-34834782', NULL, 'info@husaini.org', 'Open 24 Hours', ARRAY['open24'], ARRAY['Blood Collection','Transfusion','Screening'], 'Located in Khan Hospital, Gulshan Block 5.', 24.9067, 67.0819),

('Husaini Blood Bank — Korangi', 'Korangi', 'Korangi No. 3.5, Near PSO Petrol Station, Korangi, Karachi', '0315-2497011', NULL, 'info@husaini.org', 'Open 24 Hours', ARRAY['open24'], ARRAY['Blood Collection','Transfusion'], 'Serving Korangi industrial and residential areas.', 24.8302, 67.0954),

('Husaini Blood Bank — Kala Board', 'Kala Board / Darakhshan', 'Near Nihal Hospital, Darakhshan Cooperative Housing Society, Kala Board, Karachi', '021-34503829', '0333-3998331', 'info@husaini.org', 'Open 24 Hours', ARRAY['open24'], ARRAY['Blood Collection','Screening','Transfusion'], 'Kala Board area branch.', 24.8197, 67.0852),

('Husaini Blood Bank — Nazimabad', 'Nazimabad', 'Opp. Abbasi Shaheed Hospital, Tabish Dehlavi Road, Block-3, Nazimabad, Karachi', '021-36640602', '0333-3671639', 'info@husaini.org', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Blood Collection','Thalassemia','Transfusion'], 'Opposite Abbasi Shaheed Hospital.', 24.9118, 67.0367),

('Husaini Blood Bank — Lady Dufferin', 'Saddar', 'Lady Dufferin Hospital, Chand Bibi Road, Saddar, Karachi', '0333-3998308', NULL, 'info@husaini.org', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Blood Collection','Transfusion','Gynae Support'], 'Inside Lady Dufferin Hospital.', 24.8641, 67.0101),

('Husaini Blood Bank — M.A. Jinnah Road', 'Saddar / M.A. Jinnah Road', 'Shop G-12, Zeenat Medicine Market, Denso Hall, M.A. Jinnah Road, Karachi', '021-32727631', '0345-2382728', 'info@husaini.org', 'Open 24 Hours', ARRAY['open24'], ARRAY['Blood Collection','Walk-in Donation','Screening'], 'Busy commercial area near Denso Hall.', 24.8620, 67.0135),

-- FATIMID FOUNDATION
('Fatimid Foundation — Karachi HQ', 'Garden East / Britto Road', '393 Britto Road, Garden East, Karachi-74800', '021-32225284', '021-32253323', 'info@fatimid.org', 'Mon–Sat 8:00 AM – 6:00 PM', ARRAY['free'], ARRAY['Thalassemia','Hemophilia','Von Willebrand Disease','Free Blood','Donor Registration'], 'Largest NGO blood bank in Pakistan. Est. 1978. Serves 14,000+ registered patients.', 24.8645, 67.0148),

-- JPMC BLOOD BANK
('JPMC Blood Bank — Patients Aid Foundation', 'Saddar', 'Jinnah Postgraduate Medical Centre, Rafiqui Shaheed Road, Saddar, Karachi', '021-99201300', '021-99201301', 'info@paf.org.pk', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['300+ Pints Daily','Hepatitis B/C Screening','HIV Screening','Malaria Screening'], 'Karachi''s oldest (est. 1949) and largest public blood bank. 300 pints/day. EQAS Australia affiliated.', 24.8641, 67.0104),

-- CIVIL HOSPITAL BLOOD BANK
('Civil Hospital Blood Bank — PWA', 'Saddar', 'Dr. Ruth K.M. Pfau Civil Hospital, Baba-e-Urdu Road, Saddar, Karachi', '021-99215740', '021-99215745', 'info@civilhospital.gos.pk', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Packed Cells','Fresh Frozen Plasma','Mega Platelets','ELISA Screening','CLIA Screening'], 'Est. 1982. Completely free blood. 300+ pints daily. ELISA and CLIA technology.', 24.8612, 67.0122),

-- INDUS HOSPITAL
('Indus Hospital Blood Center', 'Korangi', 'Indus Hospital & Health Network, Korangi Crossing, Karachi', '021-35112709', '021-35112710', 'info@ihhn.org', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['AABB Accredited','CAP Certified','Blood Components','Apheresis','Free Blood'], 'Pakistan & SAARC''s first AABB accredited blood center. 100% free blood.', 24.8302, 67.0951),

-- AGA KHAN HOSPITAL
('Aga Khan University Hospital Blood Bank', 'Stadium Road, Gulshan', 'AKUH, Stadium Road, P.O. Box 3500, Karachi-74800', '021-34930051', '021-111-911-911', 'patientservices@aku.edu', 'Open 24 Hours', ARRAY['open24'], ARRAY['Advanced Screening','Autologous Blood','Irradiated Blood','Washed RBCs','Platelet Apheresis'], 'International standard. JCI accredited hospital blood bank.', 24.9071, 67.0819),

-- LIAQUAT NATIONAL HOSPITAL
('Liaquat National Hospital Blood Bank', 'Stadium Road, Gulshan', 'Liaquat National Hospital, Stadium Road, Block 14, Gulshan-e-Iqbal, Karachi', '021-34412265', '021-111-000-565', 'info@lnh.edu.pk', 'Open 24 Hours', ARRAY['open24'], ARRAY['Full Blood Bank','Components','Screening','Platelet Concentrate'], 'Major tertiary care hospital blood bank.', 24.9052, 67.0793),

-- DOW UNIVERSITY IBD
('Dow University Blood Bank — IBD', 'Gulzar-e-Hijri, Scheme 33', 'Ishrat ul Ibad Khan Institute of Blood Diseases, Gulzar-e-Hijri, Scheme 33, DUHS Ojha Campus, Karachi', '021-38771111', NULL, 'ibd@duhs.edu.pk', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Thalassemia','Hemophilia','Bone Marrow','Donation Camps','Free Blood'], 'Est. 2012 at DUHS Ojha Campus. Specialized in blood disorders.', 24.9661, 67.1014),

-- BURHANI BLOOD BANK
('Burhani Blood Bank', 'North Nazimabad', 'ST-1, Block-F, North Nazimabad, Near Chase-up Departmental Store, Karachi', '021-36644490', NULL, 'burhanibloodbank@gmail.com', '8:00 AM – 10:00 PM', ARRAY['free'], ARRAY['Thalassemia','FDA Licensed','Blood Transfusion','Voluntary Donation'], 'FDA licensed. Especially for Thalassemia patients. Member of State Blood Transfusion Council.', 24.9312, 67.0401),

-- CHUGHTAI BLOOD CENTER
('Chughtai Blood Center', 'P.E.C.H.S / Shaheed-e-Millat', 'Plot No. 2, Block 3, P.E.C.H.S, Shaheed-e-Millat Road, Karachi', '021-111-456-789', NULL, 'karachi@chughtailab.com', '7:00 AM – 10:00 PM', ARRAY[], ARRAY['ISO Accredited','CAP Certified','Apheresis','Component Prep','Antigen-matched Blood'], 'ISO & CAP certified. Antigen-matched blood for Thalassemia patients.', 24.8824, 67.0503),

-- NATIONAL MEDICAL CENTRE
('National Medical Centre Blood Bank', 'DHA / Korangi Road', 'A-5/A, National Highway, Phase 1, DHA, Near Kala Pul, Korangi Road, Karachi-75500', '021-35315004', NULL, 'bloodbank@nmc.net.pk', 'Open 24 Hours', ARRAY['open24'], ARRAY['FDA Licensed','Full Screening','Blood Components','Rational Blood Use'], 'FDA licensed. Member State Blood Transfusion Council & Federation of Blood Banks.', 24.8201, 67.0851),

-- PAKISTAN RED CRESCENT
('Pakistan Red Crescent Blood Bank', 'Clifton / Bath Island', 'Hilal-e-Ahmar House, Teen Talwar Chowk, Khayaban-e-Iqbal, Bath Island, Clifton, Karachi', '021-35836275', '021-35830376', 'info@prcs.org.pk', '8:00 AM – 6:00 PM', ARRAY[], ARRAY['Voluntary Donation','Blood Screening','National Network','Blood Camps'], 'Official blood bank of Pakistan Red Crescent Society. Regular donation drives.', 24.8113, 67.0281),

-- EDHI BLOOD BANK
('Edhi Blood Bank', 'Mithadar / Boulton Market', 'Sarafa Bazar, Boulton Market, Mithadar, Karachi', '021-32413232', NULL, 'info@edhi.org', 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Free Blood','Emergency Blood','Walk-in Donation','No Registration Required'], 'Part of Edhi Welfare Organisation. Emergency blood available anytime.', 24.8576, 67.0201),

-- ST. JOHN AMBULANCE
('St. John Ambulance Blood Bank', 'Saddar', 'Behind Empress Market, Saddar, Karachi', '021-32250500', '021-32250600', NULL, 'Open 24 Hours', ARRAY['free','open24'], ARRAY['Emergency Blood','Free Blood','Walk-in Donation'], 'Part of St. John Ambulance Pakistan. Emergency services available.', 24.8602, 67.0094),

-- AL MUSTAFA
('Al-Mustafa Diagnostic Centre Blood Bank', 'Gulshan-e-Iqbal', 'ST-1, Block 13-C, Gulshan-e-Iqbal, Karachi', '021-34966537', NULL, NULL, '8:00 AM – 8:00 PM', ARRAY[], ARRAY['Blood Bank','Diagnostics','Screening'], 'Combined diagnostic and blood bank facility.', 24.9218, 67.0912);
