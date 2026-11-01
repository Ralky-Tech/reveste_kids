//importando o model de usuarios
import User from "../models/Users.js"

class userService{
    async ensureGoogleIdentityIndexes() {
        // Production indexes are managed externally. Authentication only reads
        // their definitions; it must not trigger model/index initialization.
        if (process.env.NODE_ENV !== "production") await User.init();
        const indexes = await User.collection.listIndexes().toArray();
        const subIndex = indexes.some(index =>
            index.key?.googleSub === 1 && Object.keys(index.key).length === 1 &&
            index.unique === true && (!index.collation || index.collation.locale === "simple") &&
            Object.keys(index.partialFilterExpression || {}).length === 1 &&
            Object.keys(index.partialFilterExpression.googleSub || {}).length === 1 &&
            index.partialFilterExpression.googleSub.$type === "string"
        );
        const emailIndex = indexes.some(index =>
            index.key?.email === 1 && Object.keys(index.key).length === 1 &&
            index.unique === true && !index.partialFilterExpression &&
            index.collation?.locale === "en" && index.collation?.strength === 2 &&
            index.collation.caseLevel !== true
        );
        if (!subIndex || !emailIndex) throw new Error("Google identity indexes unavailable");
    }

    async getByGoogleSub(googleSub) {
        return User.find({ googleSub }).limit(2);
    }

    async getByGoogleEmail(email) {
        return User.findOne({ email }).collation({ locale: "en", strength: 2 });
    }

    async createGoogleUser({ name, email, password, googleSub }) {
        const user = new User({ name, email, password, googleSub, role: "user" });
        await user.save();
        return user;
    }

    //Metodo para cadastar um usuario
    async Create(name, email, password, role = "user"){
        try{
            const newUser = new User({
                name,
                email,
                password,
                role
            })
            //.save() -> utilzado para gravar um registro no BD
            await newUser.save();
            return newUser
        }catch (error){
            console.log(error)
            throw error
        }
    }

    //método para buscar um usuario
    async getOne(email){
        try{
            // o metodo findone busca um reguistro no bd
            const user = await User.findOne({email: email})
            return user
        }catch (error) {
            console.log(error)
            throw error
        }
    }
}

export default new userService();
