"""Exercise the actual booking SQL, including competing requests, in a disposable PostgreSQL."""
from concurrent.futures import ThreadPoolExecutor
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from services import BOOKING_QUERY


class BookingDatabase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        binary = shutil.which('postgres')
        if not binary:
            raise unittest.SkipTest('PostgreSQL server binaries are required for the booking concurrency checks.')
        cls.bin = Path(binary).resolve().parent
        cls.env = {key: value for key, value in os.environ.items() if not key.startswith('PG')}
        cls.temp = tempfile.TemporaryDirectory(prefix='onward-booking-')
        cls.addClassCleanup(cls.temp.cleanup)
        cls.root = Path(cls.temp.name)
        cls.data = cls.root / 'data'
        subprocess.run([str(cls.bin / 'initdb'), '-D', str(cls.data), '--no-locale', '--encoding=UTF8',
                        '--auth=trust'], check=True, capture_output=True, env=cls.env)
        subprocess.run([str(cls.bin / 'pg_ctl'), '-D', str(cls.data), '-l', str(cls.root / 'postgres.log'),
                        '-o', f"-h '' -k {cls.root} -p 5432", '-w', '-t', '15', 'start'],
                       check=True, capture_output=True, env=cls.env)
        cls.addClassCleanup(cls.stop_database)
        cls.sql("""CREATE TABLE offers(id text PRIMARY KEY,carrier text,fare_pence integer,bag_pence integer,
                    seats integer CHECK(seats>=0),seat_selection_included boolean,updated_at timestamptz DEFAULT now());
                   CREATE TABLE hotels(id text PRIMARY KEY,night_pence integer,rooms integer CHECK(rooms>=0));
                   CREATE TABLE bookings(id text PRIMARY KEY,session_id text UNIQUE,traveller_id text,offer_id text,
                    hotel_id text,total_pence integer,policy_decision text,created_at timestamptz DEFAULT now());""")

    @classmethod
    def stop_database(cls):
        subprocess.run([str(cls.bin / 'pg_ctl'), '-D', str(cls.data), '-m', 'immediate', '-w', 'stop'],
                       check=True, capture_output=True, env=cls.env)

    @classmethod
    def sql(cls, query):
        result = subprocess.run([str(cls.bin / 'psql'), '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
                                 '-h', str(cls.root), '-p', '5432', '-d', 'postgres', '-c', query],
                                check=False, capture_output=True, text=True, env=cls.env)
        if result.returncode:
            raise RuntimeError(result.stderr)
        return result.stdout.strip()

    def setUp(self):
        self.sql("""TRUNCATE bookings,offers,hotels;
                    INSERT INTO offers VALUES('AX218','Aster Air',25500,3500,2,true,now());
                    INSERT INTO hotels VALUES('patio-house',16500,2);""")

    def book(self, session='one', **overrides):
        values = dict(offer='AX218', hotel='patio-house', booking='ONW-' + session, session=session,
                      traveller='alex-onward', total=49000, policy='permit', bags=1, nights=1,
                      transfer=3500, budget=65000)
        values.update(overrides)
        # Test-only literal binding; production uses Data API parameters.
        def literal(match):
            value = values[match.group(1)]
            return str(value) if isinstance(value, int) else "'" + value.replace("'", "''") + "'"
        return self.sql(re.sub(r'(?<!:):([a-z]+)\b', literal, BOOKING_QUERY))

    def stock(self):
        return self.sql('SELECT seats,rooms,(SELECT count(*) FROM bookings) FROM offers CROSS JOIN hotels')

    def test_empty_hotel_does_not_consume_a_seat(self):
        self.sql('UPDATE hotels SET rooms=0')
        self.assertEqual(self.book(), '')
        self.assertEqual(self.stock(), '2|0|0')

    def test_empty_flight_does_not_consume_a_room(self):
        self.sql('UPDATE offers SET seats=0')
        self.assertEqual(self.book(), '')
        self.assertEqual(self.stock(), '0|2|0')

    def test_price_and_airline_are_checked_inside_the_atomic_write(self):
        for mutation in ("UPDATE offers SET fare_pence=25600", "UPDATE offers SET carrier='Meridian Europe'",
                         "UPDATE offers SET seat_selection_included=false"):
            with self.subTest(mutation=mutation):
                self.setUp()
                self.sql(mutation)
                self.assertEqual(self.book(), '')
                self.assertEqual(self.stock(), '2|2|0')

    def test_equal_budget_cannot_be_booked(self):
        self.assertEqual(self.book(budget=49000), '')
        self.assertEqual(self.stock(), '2|2|0')

    def test_retry_does_not_take_more_stock(self):
        self.assertIn('ONW-one', self.book())
        self.assertEqual(self.book(), '')
        self.assertEqual(self.stock(), '1|1|1')

    def test_competing_requests_for_last_room_are_all_or_nothing(self):
        self.sql('UPDATE hotels SET rooms=1')
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(self.book, ['a', 'b', 'c', 'd']))
        self.assertEqual(sum(bool(result) for result in results), 1)
        self.assertEqual(self.stock(), '1|0|1')

    def test_simultaneous_confirmations_in_one_session_book_once(self):
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(self.book, ['same'] * 4))
        self.assertEqual(sum(bool(result) for result in results), 1)
        self.assertEqual(self.stock(), '1|1|1')
