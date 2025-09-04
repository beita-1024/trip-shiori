import { Router } from 'express';
import { createItinerary, getItinerary, getAllItineraries } from './itinerariesController';

const router = Router();

/**
 * 旅のしおり関連のルート
 */
router.post('/', createItinerary);
router.get('/:id', getItinerary);
router.get('/', getAllItineraries);

export default router;
