import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Store, 
  Star, 
  Clock, 
  Bike, 
  Plus, 
  Check, 
  MapPin, 
  ArrowRight,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import api from '../services/api';
import { useCart } from '../contexts/CartContext';
import './Restaurants.css';

export default function Restorantet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const kategoriaNgaUrl = searchParams.get('kategoria') || searchParams.get('category') || 'all';

  const [kategoriaAktive, setKategoriaAktive] = useState(kategoriaNgaUrl);
  const [kerkoTekst, setKerkoTekst] = useState('');
  const [artikujShtuar, setArtikujShtuar] = useState({});
  const [restorantetApi, setRestorantetApi] = useState([]);
  const [dukeNgarkuar, setDukeNgarkuar] = useState(false);

  const { addItem } = useCart();

  // Sinkronizo me ndryshimet në URL
  useEffect(() => {
    const param = searchParams.get('kategoria') || searchParams.get('category') || 'all';
    setKategoriaAktive(param);
  }, [searchParams]);

  // Ngarko restorantet nga API
  useEffect(() => {
    async function ngarkoRestorantet() {
      try {
        setDukeNgarkuar(true);
        const res = await api.get('/public/restaurants');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setRestorantetApi(res.data.data);
        }
      } catch (err) {
        // Fallback i qetë te të dhënat reale lokale
      } finally {
        setDukeNgarkuar(false);
      }
    }
    ngarkoRestorantet();
  }, []);

  // Lista e plotë e Tabs të Kategorive (Wolt Style)
  const tabsKategorite = [
    { id: 'all', emri: 'Të Gjitha Produktet' },
    { id: 'pizza', emri: 'Pica' },
    { id: 'burger', emri: 'Burger' },
    { id: 'sushi', emri: 'Sushi' },
    { id: 'pasta', emri: 'Pasta' },
    { id: 'grill', emri: 'Zgarë' },
    { id: 'fast-food', emri: 'Fast Food' },
    { id: 'embelsira', emri: 'Ëmbëlsira' },
    { id: 'pije', emri: 'Pije & Kafe' },
  ];

  // ==========================================================================
  // Katalogu i Ushqimeve & Produkteve Reale sipas Kategorive
  // ==========================================================================
  const teGjithaProduktet = useMemo(() => [
    // --- LLOJET E PICAVE ---
    {
      id: 'p1',
      emri: 'Pica Margherita Napolitane',
      kategoria: 'pizza',
      pershkrimi: 'Salcë domatesh San Marzano, mozzarella fior di latte, borzilok i freskët dhe vaj ulliri ekstra i virgjër.',
      cmimi: 5.50,
      koha: '20-25 min',
      vleresimi: 4.9,
      bejxhi: 'Traditë Italiane',
      restoranti: 'Proper Pizza Prishtinë',
      restorantiSlug: 'proper-pizza-prishtine',
      foto: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p2',
      emri: 'Pica Pepperoni Diavola',
      kategoria: 'pizza',
      pershkrimi: 'Mozzarella e shkrirë, sallam pikant italian pepperoni, salcë domatesh të freskëta dhe rigon organik.',
      cmimi: 6.80,
      koha: '20-25 min',
      vleresimi: 4.9,
      bejxhi: 'Më e Porositura',
      restoranti: 'Proper Pizza Prishtinë',
      restorantiSlug: 'proper-pizza-prishtine',
      foto: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p3',
      emri: 'Pica Capricciosa Rustica',
      kategoria: 'pizza',
      pershkrimi: 'Proshutë pule artizanale, kërpudha të freskëta champignon, ullinj kalamata dhe djathë mozzarella.',
      cmimi: 6.50,
      koha: '20-30 min',
      vleresimi: 4.8,
      bejxhi: 'Klasike',
      restoranti: 'Proper Pizza Prishtinë',
      restorantiSlug: 'proper-pizza-prishtine',
      foto: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p4',
      emri: 'Pica Quattro Formaggi',
      kategoria: 'pizza',
      pershkrimi: 'Kombinim i pasur me mozzarella, gorgonzola kremoze, parmigiano reggiano dhe djathë fontina të shkrirë.',
      cmimi: 7.20,
      koha: '20-25 min',
      vleresimi: 4.9,
      bejxhi: 'Recetë Gurmet',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p5',
      emri: 'Pica me Proshutë Krudo & Tartuf',
      kategoria: 'pizza',
      pershkrimi: 'Krem tartufi të zi, proshutë e tharë krudo, gjethe rukole të egër dhe thela parmixhani.',
      cmimi: 8.50,
      koha: '25-30 min',
      vleresimi: 5.0,
      bejxhi: 'Ekskluzive',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'p6',
      emri: 'Pica Burrata & Pesto Borziloku',
      kategoria: 'pizza',
      pershkrimi: 'Brumë i fermentuar 48 orë, pesto xhenoveze, domate qershizë të konfikuara dhe djathë i plotë Burrata në qendër.',
      cmimi: 8.90,
      koha: '25-30 min',
      vleresimi: 4.9,
      bejxhi: 'Specialitet Shefi',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80',
    },

    // --- LLOJET E BURGERAVE ---
    {
      id: 'b1',
      emri: 'Smash Burger Classic',
      kategoria: 'burger',
      pershkrimi: 'Dy qofte viçi të freskët të shtypura krokante, dyfish cheddar amerikan, salcë sekrete dhe kastravecë turshi në brioche.',
      cmimi: 5.80,
      koha: '15-20 min',
      vleresimi: 4.9,
      bejxhi: 'Më i Shituri',
      restoranti: 'Smash Burger Bar',
      restorantiSlug: 'smash-burger-bar',
      foto: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'b2',
      emri: 'Truffle & Mushroom Burger',
      kategoria: 'burger',
      pershkrimi: 'Mish viçi Black Angus, kërpudha pylli të karamelizuara me hudhër, majonezë me tartuf dhe djathë zviceran.',
      cmimi: 7.50,
      koha: '20-25 min',
      vleresimi: 4.9,
      bejxhi: 'Gurmet',
      restoranti: 'Smash Burger Bar',
      restorantiSlug: 'smash-burger-bar',
      foto: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'b3',
      emri: 'Bacon Double Cheese Burger',
      kategoria: 'burger',
      pershkrimi: 'Dy qofte 120g mish viçi, proshutë viçi e thekur krokante, djathë cheddar i dyfishtë dhe salcë BBQ e tymosur.',
      cmimi: 6.90,
      koha: '15-25 min',
      vleresimi: 4.8,
      bejxhi: 'Plot Shije',
      restoranti: 'Smash Burger Bar',
      restorantiSlug: 'smash-burger-bar',
      foto: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'b4',
      emri: 'Crispy Buttermilk Chicken Burger',
      kategoria: 'burger',
      pershkrimi: 'Kofshë pule e butë e marinuar në dhallë me panim super krokant, sallatë lakre coleslaw dhe salcë pikante me mjaltë.',
      cmimi: 5.50,
      koha: '15-20 min',
      vleresimi: 4.8,
      bejxhi: 'Krokant',
      restoranti: 'Smash Burger Bar',
      restorantiSlug: 'smash-burger-bar',
      foto: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600&auto=format&fit=crop&q=80',
    },

    // --- LLOJET E SUSHIT ---
    {
      id: 's1',
      emri: 'Salmon Philadelphia Roll (8 copë)',
      kategoria: 'sushi',
      pershkrimi: 'Salmon i freskët norvegjez sashimi, krem djathi philadelphia, avokado hass dhe susam i thekur.',
      cmimi: 7.90,
      koha: '25-35 min',
      vleresimi: 4.9,
      bejxhi: 'Top Cilësi',
      restoranti: 'Sushico Tirana',
      restorantiSlug: 'sushico-tirana',
      foto: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 's2',
      emri: 'Dragon Roll me Karkalec Tempura',
      kategoria: 'sushi',
      pershkrimi: 'Karkaleca të skuqur në tempura brenda, avokado e prerë hollë sipër, vezë peshku masago dhe salcë unagi.',
      cmimi: 9.80,
      koha: '30-40 min',
      vleresimi: 4.9,
      bejxhi: 'Shef Special',
      restoranti: 'Sushico Tirana',
      restorantiSlug: 'sushico-tirana',
      foto: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 's3',
      emri: 'Spicy Tuna Roll (8 copë)',
      kategoria: 'sushi',
      pershkrimi: 'Ton i kuq i prerë imët me majonezë pikante japoneze, kastravec krokant dhe thekon tempura.',
      cmimi: 8.50,
      koha: '25-35 min',
      vleresimi: 4.8,
      bejxhi: 'Pikant',
      restoranti: 'Sushico Tirana',
      restorantiSlug: 'sushico-tirana',
      foto: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
    },

    // --- LLOJET E PASTAVE ---
    {
      id: 'pa1',
      emri: 'Tagliatelle al Tartufo di Norcia',
      kategoria: 'pasta',
      pershkrimi: 'Pasta e freskët me vezë e përgatitur me dorë, gjalpë tartufi të zi, krem parmigiano reggiano 24-mujor.',
      cmimi: 7.80,
      koha: '20-30 min',
      vleresimi: 4.9,
      bejxhi: 'Italiane',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'pa2',
      emri: 'Spaghetti alla Carbonara Autentike',
      kategoria: 'pasta',
      pershkrimi: 'Guanciale krokante e thekur, të verdha veze të freskëta, djathë pecorino romano dhe piper i zi i bluar në çast.',
      cmimi: 6.90,
      koha: '20-25 min',
      vleresimi: 4.8,
      bejxhi: 'Origjinale',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'pa3',
      emri: 'Lasagna Tradicionale Bolognese',
      kategoria: 'pasta',
      pershkrimi: 'Shtresa të buta paste të freskët, ragù viçi me zierje të ngadaltë 6 orë, beshamel i kadifenjtë dhe parmigiano.',
      cmimi: 7.20,
      koha: '25-35 min',
      vleresimi: 4.9,
      bejxhi: 'Në Furrë',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600&auto=format&fit=crop&q=80',
    },

    // --- LLOJET E ZGARËS ---
    {
      id: 'g1',
      emri: 'Qebapa Tradicionalë me Samun (10 copë)',
      kategoria: 'grill',
      pershkrimi: 'Mish viçi vendor i pastër i pjekur me prush pishe, qepë e freskët, kajmak fshati dhe samun i ngrohtë me fara.',
      cmimi: 5.00,
      koha: '20-30 min',
      vleresimi: 4.9,
      bejxhi: 'Autentike',
      restoranti: 'Taverna Tradicionale',
      restorantiSlug: 'taverna-tirona-grill',
      foto: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'g2',
      emri: 'Mix Skare Tastio (Për 2 Persona)',
      kategoria: 'grill',
      pershkrimi: 'Qebapa, pleskavicë e mbushur me djathë, suxhuk shtëpie, fileto pule në zgarë dhe patate të pjekura me erëza.',
      cmimi: 13.50,
      koha: '30-40 min',
      vleresimi: 4.8,
      bejxhi: 'Pjatë e Pasur',
      restoranti: 'Taverna Tradicionale',
      restorantiSlug: 'taverna-tirona-grill',
      foto: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'g3',
      emri: 'Pleskavicë Sharri me Kaçkavall',
      kategoria: 'grill',
      pershkrimi: 'Mish viçi cilësor i mbushur bujarisht me djathë kaçkavall të shkrirë, i shërbyer me ajvar dhe patate shtëpie.',
      cmimi: 6.50,
      koha: '25-35 min',
      vleresimi: 4.8,
      bejxhi: 'Specialitet',
      restoranti: 'Taverna Tradicionale',
      restorantiSlug: 'taverna-tirona-grill',
      foto: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600&auto=format&fit=crop&q=80',
    },

    // --- FAST FOOD ---
    {
      id: 'ff1',
      emri: 'Crispy Chicken Tenders & Fries (6 copë)',
      kategoria: 'fast-food',
      pershkrimi: 'Fileto të freskëta pule me panim ekstra krokant, patate të skuqura dhe dy salca zgjedhjeje.',
      cmimi: 5.20,
      koha: '15-20 min',
      vleresimi: 4.8,
      bejxhi: 'Krokante',
      restoranti: 'Smash Burger Bar',
      restorantiSlug: 'smash-burger-bar',
      foto: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'ff2',
      emri: 'Loaded Cheese & Bacon Fries',
      kategoria: 'fast-food',
      pershkrimi: 'Patate krokante të mbuluara me krem djathi cheddar të nxehtë, proshutë krokante dhe qepë të njoma.',
      cmimi: 3.80,
      koha: '15-20 min',
      vleresimi: 4.7,
      bejxhi: 'E Pëlqyer',
      restoranti: 'Smash Burger Bar',
      restorantiSlug: 'smash-burger-bar',
      foto: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
    },

    // --- ËMBËLSIRA ---
    {
      id: 'e1',
      emri: 'San Sebastian Cheesecake me Çokollatë Belge',
      kategoria: 'embelsira',
      pershkrimi: 'Cheesecake bask me kore të karamelizuar dhe zemër kremoze, i spërkatur me çokollatë të ngrohtë qumështi.',
      cmimi: 4.50,
      koha: '15-20 min',
      vleresimi: 5.0,
      bejxhi: 'Delikatesë',
      restoranti: 'Pasticeri Reka',
      restorantiSlug: 'pasticeri-reka',
      foto: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'e2',
      emri: 'Tiramisu Tradicionale me Mascarpone',
      kategoria: 'embelsira',
      pershkrimi: 'Biskota savoiardi italiane të zhytura në espresso të fortë, krem i lehtë mascarpone dhe kakao e zezë cilësore.',
      cmimi: 4.20,
      koha: '15-20 min',
      vleresimi: 4.9,
      bejxhi: 'Artizanale',
      restoranti: 'Pasticeri Reka',
      restorantiSlug: 'pasticeri-reka',
      foto: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    },

    // --- PIJE & KAFE ---
    {
      id: 'd1',
      emri: 'Iced Caramel Macchiato Artizanal',
      kategoria: 'pije',
      pershkrimi: 'Espresso e freskët e ftohur, qumësht i plotë kremoz, akull dhe shurup karameli i përgatitur vetë.',
      cmimi: 2.80,
      koha: '10-15 min',
      vleresimi: 4.9,
      bejxhi: 'Freskuese',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'd2',
      emri: 'Lëng Portokalli & Karote i Sapo Shtrydhur',
      kategoria: 'pije',
      pershkrimi: '100% fruta natyrale të shtrydhura në çast pa sheqer të shtuar dhe pa konservues.',
      cmimi: 2.50,
      koha: '10-15 min',
      vleresimi: 4.8,
      bejxhi: '100% Natyral',
      restoranti: 'Tartine Artisan Deli',
      restorantiSlug: 'tartine-artisan-deli',
      foto: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    },
  ], []);

  // Lista e Restoranteve Partnere
  const restorantetLokale = useMemo(() => [
    {
      id: 1,
      slug: 'proper-pizza-prishtine',
      name: 'Proper Pizza Prishtinë',
      kategori: 'pizza',
      cuisine: 'Pica Napolitane • Italiane • Furrë me Dru',
      description: 'Pica tradicionale napolitane me brumë të thartë natyral të fermentuar 48 orë dhe përbërës të importuar nga Italia.',
      rating: '4.9',
      reviews: '540+',
      time: '20–30 min',
      fee: 'Dërgesa Falas',
      banner: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&auto=format&fit=crop&q=80',
      logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80'
    },
    {
      id: 2,
      slug: 'smash-burger-bar',
      name: 'Smash Burger Bar',
      kategori: 'burger',
      cuisine: 'Smash Burger • Fast Food • Patate me Tartuf',
      description: 'Smash burger premium me mish viçi vendor të freskët, cheddar origjinal dhe bukë brioche të butë me gjalpë.',
      rating: '4.8',
      reviews: '380+',
      time: '15–25 min',
      fee: 'Dërgesa 0.99 €',
      banner: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
      logo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80'
    },
    {
      id: 3,
      slug: 'sushico-tirana',
      name: 'Sushico Tirana & Prishtinë',
      kategori: 'sushi',
      cuisine: 'Sushi • Aziatike • Poke Bowl • Ramen',
      description: 'Rolls të freskëta sushi me salmon norvegjez, karkaleca tempura dhe specialitete autentike japoneze.',
      rating: '4.9',
      reviews: '290+',
      time: '30–40 min',
      fee: 'Dërgesa Falas',
      banner: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=800&auto=format&fit=crop&q=80',
      logo: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200&auto=format&fit=crop&q=80'
    },
    {
      id: 4,
      slug: 'tartine-artisan-deli',
      name: 'Tartine Artisan Deli & Pasta',
      kategori: 'pasta',
      cuisine: 'Pasta e Freskët • Sanduiçë Sourdough • Sallata',
      description: 'Pasta italiane me vezë të punuara në çast, salca tartufi, sanduiçë me bukë fshati dhe pije organike.',
      rating: '4.7',
      reviews: '210+',
      time: '25–35 min',
      fee: 'Dërgesa 0.99 €',
      banner: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&auto=format&fit=crop&q=80',
      logo: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=200&auto=format&fit=crop&q=80'
    },
    {
      id: 5,
      slug: 'pasticeri-reka',
      name: 'Pasticeri Reka & Desserts',
      kategori: 'embelsira',
      cuisine: 'Ëmbëlsira • Cheesecakes • Torta Ditëlindjesh',
      description: 'Cheesecake San Sebastian, tiramisu me mascarpone italiane dhe ëmbëlsira artizanale të përgatitura çdo ditë.',
      rating: '4.9',
      reviews: '410+',
      time: '20–30 min',
      fee: 'Dërgesa Falas',
      banner: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&auto=format&fit=crop&q=80',
      logo: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=80'
    },
    {
      id: 6,
      slug: 'taverna-tirona-grill',
      name: 'Taverna Tradicionale & Grill',
      kategori: 'grill',
      cuisine: 'Mish në Zgarë • Qebapa • Specialitete Furre',
      description: 'Mish viçi vendor i pjekur në prush druri, samun të ngrohtë, tava dheu dhe pjata tradicionale shqiptare.',
      rating: '4.8',
      reviews: '350+',
      time: '30–45 min',
      fee: 'Dërgesa 1.20 €',
      banner: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80',
      logo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&auto=format&fit=crop&q=80'
    },
  ], []);

  // Ndërro kategorinë dhe azhurno URL
  const trajtoZgjedhjenKategorise = (katId) => {
    setKategoriaAktive(katId);
    if (katId === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ kategoria: katId });
    }
  };

  // Filtro produktet sipas kategorisë dhe tekstit të kërkimit
  const produktetFiltruar = useMemo(() => {
    return teGjithaProduktet.filter((prod) => {
      // Normalizo emrat e kategorive
      const perputhetKategoria = 
        kategoriaAktive === 'all' || 
        prod.kategoria === kategoriaAktive ||
        (kategoriaAktive === 'pica' && prod.kategoria === 'pizza') ||
        (kategoriaAktive === 'pizza' && prod.kategoria === 'pizza') ||
        (kategoriaAktive === 'zgare' && prod.kategoria === 'grill');

      const perputhetKerko = 
        !kerkoTekst.trim() ||
        prod.emri.toLowerCase().includes(kerkoTekst.toLowerCase()) ||
        prod.pershkrimi.toLowerCase().includes(kerkoTekst.toLowerCase()) ||
        prod.restoranti.toLowerCase().includes(kerkoTekst.toLowerCase());

      return perputhetKategoria && perputhetKerko;
    });
  }, [teGjithaProduktet, kategoriaAktive, kerkoTekst]);

  // Filtro restorantet përkatëse
  const restorantetFiltruar = useMemo(() => {
    if (kategoriaAktive === 'all') return restorantetLokale;
    return restorantetLokale.filter((r) => {
      return (
        r.kategori === kategoriaAktive ||
        (kategoriaAktive === 'pica' && r.kategori === 'pizza') ||
        (kategoriaAktive === 'zgare' && r.kategori === 'grill')
      );
    });
  }, [restorantetLokale, kategoriaAktive]);

  // Shto në shportë me feedback visual
  const shtoNeShporte = (e, prod) => {
    e.preventDefault();
    e.stopPropagation();

    addItem({
      id: prod.id,
      name: prod.emri,
      base_price: prod.cmimi,
      price: prod.cmimi,
      image_url: prod.foto,
      restaurant_name: prod.restoranti
    }, [], 1);

    setArtikujShtuar((prev) => ({ ...prev, [prod.id]: true }));
    setTimeout(() => {
      setArtikujShtuar((prev) => ({ ...prev, [prod.id]: false }));
    }, 1800);
  };

  // Titulli dinamik sipas kategorisë
  const merrTitullinKategorise = () => {
    switch (kategoriaAktive) {
      case 'pizza':
      case 'pica':
        return 'Llojet e Picave & Restorantet';
      case 'burger':
        return 'Llojet e Burgerave & Restorantet';
      case 'sushi':
        return 'Llojet e Sushit & Restorantet Japoneze';
      case 'pasta':
        return 'Llojet e Pastave Italiane & Restorantet';
      case 'grill':
      case 'zgare':
        return 'Specialitetet e Zgarës & Restorantet Tradicionale';
      case 'fast-food':
        return 'Ushqimet e Shpejta & Tenders Krokante';
      case 'embelsira':
        return 'Ëmbëlsirat Artizanale & Cheesecakes';
      case 'pije':
        return 'Kafe Speciale & Pije Freskuese';
      default:
        return 'Të Gjitha Produktet & Restorantet Partnere';
    }
  };

  const merrPershkriminKategorise = () => {
    switch (kategoriaAktive) {
      case 'pizza':
      case 'pica':
        return 'Zbuloni picat më të shijshme napolitane, brumin artizanal me fermentim të ngadaltë dhe piceritë më të mira pranë teje.';
      case 'burger':
        return 'Smash burger premium me mish viçi cilësor, djathë cheddar të shkrirë dhe patate krokante nga restorantet më të vlerësuara.';
      case 'sushi':
        return 'Rolls të freskëta me salmon, ton sashimi, karkaleca tempura dhe pjata aziatike me cilësi maksimale.';
      case 'pasta':
        return 'Receta autentike italiane: tagliatelle me tartuf, spaghetti carbonara, lasagna të sapo pjekura dhe ravioli të bëra me dorë.';
      case 'grill':
      case 'zgare':
        return 'Qebapa tradicionalë, pleskavicë sharri, mish i pjekur në prush druri dhe shije autentike vendore.';
      case 'fast-food':
        return 'Fileto pule krokante, hot dog gurmet, patate të mbushura dhe porosi të shpejta që vijnë direkt te dera jote.';
      case 'embelsira':
        return 'San Sebastian cheesecake me çokollatë të nxehtë, tiramisu italiane me mascarpone dhe ëmbëlsira të freskëta artizanale.';
      case 'pije':
        return 'Kafe të përzgjedhura 100% Arabica, lëngje frutash të sapo shtrydhura dhe pije freskuese për çdo moment.';
      default:
        return 'Eksploroni menynë e plotë me të gjitha llojet e ushqimeve, ëmbëlsirave dhe pijeve nga restorantet më të mira partnere.';
    }
  };

  return (
    <div className="tastio-products-page">
      <div className="tastio-products-container">
        
        {/* ==========================================================
            1. HEADER I GJERË DHE I PASTER I KATALOGUT
            ========================================================== */}
        <div className="tastio-products-header">
          <div className="tastio-products-title-row">
            <div className="tastio-products-heading-col">
              <span className="tastio-products-eyebrow">
                {kategoriaAktive === 'all' ? 'Katalogu i Plotë Tastio' : `Kategoria • ${kategoriaAktive.toUpperCase()}`}
              </span>
              <h1 className="tastio-products-title">{merrTitullinKategorise()}</h1>
              <p className="tastio-products-subtitle">{merrPershkriminKategorise()}</p>
            </div>

            {/* Kërkimi i shpejtë me input të pastër */}
            <div className="tastio-filter-search-box">
              <Search size={18} className="tastio-filter-search-icon" />
              <input
                type="text"
                className="tastio-filter-search-input"
                placeholder="Kërko ushqim ose restorant..."
                value={kerkoTekst}
                onChange={(e) => setKerkoTekst(e.target.value)}
                aria-label="Kërko në katalog"
              />
              {kerkoTekst && (
                <button
                  type="button"
                  onClick={() => setKerkoTekst('')}
                  className="tastio-search-clear-btn"
                  title="Pastro kërkimin"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ==========================================================
            2. TABS TË KATEGORIVE (Wolt Style Scrollable Navigation)
            ========================================================== */}
        <div className="tastio-categories-tabs-wrap">
          <div className="tastio-categories-tabs">
            {tabsKategorite.map((tab) => {
              const eshteAktive = 
                kategoriaAktive === tab.id ||
                (tab.id === 'pizza' && kategoriaAktive === 'pica') ||
                (tab.id === 'grill' && kategoriaAktive === 'zgare');

              // Llogarit sa artikuj ka kjo kategori
              const nrArtikuj = tab.id === 'all' 
                ? teGjithaProduktet.length 
                : teGjithaProduktet.filter(p => p.kategoria === tab.id || (tab.id === 'pizza' && p.kategoria === 'pizza') || (tab.id === 'grill' && p.kategoria === 'grill')).length;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => trajtoZgjedhjenKategorise(tab.id)}
                  className={`tastio-tab-btn ${eshteAktive ? 'active' : ''}`}
                >
                  <span>{tab.emri}</span>
                  <span className="tastio-tab-count">{nrArtikuj}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ==========================================================
            3. GRID-I I GJERË I PRODUKTEVE TË ZGJEDHURA
            ========================================================== */}
        <div className="tastio-products-section-title">
          <h2>
            {kategoriaAktive === 'all' 
              ? 'Të gjitha pjatat e preferuara' 
              : `Llojet e ${tabsKategorite.find(t => t.id === kategoriaAktive)?.emri || 'Produktit'}`}
          </h2>
          <span className="tastio-products-count-badge">
            {produktetFiltruar.length} {produktetFiltruar.length === 1 ? 'Produkt i gjetur' : 'Produkte të gjetura'}
          </span>
        </div>

        {produktetFiltruar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#f5f7fa', borderRadius: '24px', margin: '20px 0 60px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
              Nuk u gjet asnjë produkt për këtë kërkim.
            </h3>
            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '20px' }}>
              Provoni të zgjidhni një kategori tjetër ose pastroni tekstin e kërkimit.
            </p>
            <button
              type="button"
              onClick={() => { setKategoriaAktive('all'); setKerkoTekst(''); setSearchParams({}); }}
              className="tastio-btn-view-all"
            >
              <span>Shfaq të gjitha produktet</span>
            </button>
          </div>
        ) : (
          <div className="tastio-products-grid">
            {produktetFiltruar.map((prod) => (
              <div key={prod.id} className="tastio-product-card">
                {/* Media me Foto dhe Badge */}
                <div className="tastio-product-media">
                  <img
                    src={prod.foto}
                    alt={prod.emri}
                    className="tastio-product-img"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <span className="tastio-product-price-badge">
                    {prod.cmimi.toFixed(2)} €
                  </span>
                  <span className="tastio-product-tag-badge">
                    {prod.bejxhi}
                  </span>
                </div>

                {/* Trupi i Produktit */}
                <div className="tastio-product-body">
                  <h3 className="tastio-product-name">{prod.emri}</h3>
                  <p className="tastio-product-desc">{prod.pershkrimi}</p>

                  {/* Restoranti dhe Butoni Shto në Shportë */}
                  <div className="tastio-product-footer">
                    <Link
                      to={`/restorante/${prod.restorantiSlug}`}
                      className="tastio-product-restaurant-link"
                      title={`Shiko menynë e ${prod.restoranti}`}
                    >
                      <Store size={15} />
                      <span>{prod.restoranti}</span>
                    </Link>

                    <button
                      type="button"
                      className={`tastio-btn-add-cart ${artikujShtuar[prod.id] ? 'added' : ''}`}
                      onClick={(e) => shtoNeShporte(e, prod)}
                      aria-label={`Shto ${prod.emri} në shportë`}
                    >
                      {artikujShtuar[prod.id] ? (
                        <>
                          <Check size={14} strokeWidth={3} />
                          <span>U shtua</span>
                        </>
                      ) : (
                        <>
                          <Plus size={14} strokeWidth={2.5} />
                          <span>Shto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==========================================================
            4. SEKSIONI I RESTORANTEVE PARTNERE PËRKATËSE
            ========================================================== */}
        <div className="tastio-partner-restaurants-wrap">
          <div className="tastio-partner-restaurants-header">
            <h2>
              {kategoriaAktive === 'all'
                ? 'Restorantet Partnere të Rekomanduara'
                : `Restorantet ku mund të porositni ${tabsKategorite.find(t => t.id === kategoriaAktive)?.emri || 'këtë ushqim'}`}
            </h2>
            <p>Porositni direkt nga kuzhinat më të mira me përgatitje të shpejtë dhe dërgesë të sigurtë</p>
          </div>

          <div className="tastio-restaurants-grid-wide">
            {restorantetFiltruar.map((rest) => (
              <Link
                key={rest.id}
                to={`/restorante/${rest.slug}`}
                className="tastio-rest-card-wide"
              >
                <div className="tastio-rest-cover-wide">
                  <img
                    src={rest.banner}
                    alt={rest.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="tastio-rest-logo-badge">
                    <img
                      src={rest.logo}
                      alt={rest.name}
                      onError={(e) => {
                        e.currentTarget.src = rest.banner;
                      }}
                    />
                  </div>
                  <div className="tastio-rest-rating-pill">
                    <Star size={13} fill="#eab308" color="#eab308" />
                    <span>{rest.rating}</span>
                  </div>
                </div>

                <div className="tastio-rest-info-wide">
                  <h3>{rest.name}</h3>
                  <p>{rest.description}</p>
                  
                  <div className="tastio-rest-meta-wide">
                    <span>
                      <Clock size={14} color="#0865F5" />
                      {rest.time}
                    </span>
                    <span>
                      <Bike size={14} color="#10b981" />
                      {rest.fee}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
