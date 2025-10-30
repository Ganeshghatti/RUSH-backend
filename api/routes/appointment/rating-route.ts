import { Router, RequestHandler } from "express";
import { verifyToken, checkRole } from "../../middleware/auth-middleware";
import {
  getMyRatings,
  getRatingsByDoctorId,
  addRating,
  toggleRatingVisibility,
  getRatingById,
} from "../../controller/appointment/ratings";

const router = Router();

// get all ratings of doctor on doctor side
router
  .route("/doctor/ratings/me")
  .get(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    getMyRatings as RequestHandler
  );

// get all rating of doctor on patient side(exclude inactive ratings)
router
  .route("/doctor/ratings/:doctorId")
  .get(verifyToken as RequestHandler, getRatingsByDoctorId as RequestHandler);

// patient can add rating to a particular appointment
router
  .route("/patient/add-rating")
  .post(
    verifyToken as RequestHandler,
    checkRole("patient") as RequestHandler,
    addRating as RequestHandler
  );

// doctor can change visibility of a rating
router
  .route("/doctor/rating/toggle/:ratingId")
  .patch(
    verifyToken as RequestHandler,
    checkRole("doctor") as RequestHandler,
    toggleRatingVisibility as RequestHandler
  );

// get a rating by rating id
router
  .route("/ratings/:ratingId")
  .get(verifyToken as RequestHandler, getRatingById as RequestHandler);

export default router;
