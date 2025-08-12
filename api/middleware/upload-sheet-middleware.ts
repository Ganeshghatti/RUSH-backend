import multer from 'multer'

export const uploadSheet = multer({dest: "uploads/"})