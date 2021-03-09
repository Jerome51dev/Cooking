const mongoose = require('mongoose');


const ingredientSchema = new mongoose.Schema({
    name : String,
    bestdish: String,
    user : String,
    quantity: Number,
    receipe: String,
    date: {
        type: Date,
        default: Date.now()
    }
});



module.exports = mongoose.model("ingredient", ingredientSchema);