"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const ratings_1 = require("../../controller/appointment/ratings");
const router = (0, express_1.Router)();
// get all ratings of doctor on doctor side
router
    .route("/doctor/ratings/me")
    .get(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), ratings_1.getMyRatings);
// get all rating of doctor on patient side(exclude inactive ratings)
router
    .route("/doctor/ratings/:doctorId")
    .get(auth_middleware_1.verifyToken, ratings_1.getRatingsByDoctorId);
// patient can add rating to a particular appointment
router
    .route("/patient/add-rating")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), ratings_1.addRating);
// doctor can change visibility of a rating
router
    .route("/doctor/rating/toggle/:ratingId")
    .patch(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), ratings_1.toggleRatingVisibility);
// get a rating by rating id
router
    .route("/ratings/:ratingId")
    .get(auth_middleware_1.verifyToken, ratings_1.getRatingById);
exports.default = router;
