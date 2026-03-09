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
// patient can add rating to a particular appointment
router
    .route("/patient/add-rating")
    .post(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("patient"), ratings_1.addRating);
// doctor can change visibility of a rating
router
    .route("/doctor/rating/toggle/:ratingId")
    .patch(auth_middleware_1.verifyToken, (0, auth_middleware_1.checkRole)("doctor"), ratings_1.toggleRatingVisibility);
exports.default = router;
