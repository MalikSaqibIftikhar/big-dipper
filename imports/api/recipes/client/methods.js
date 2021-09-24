import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Recipes } from '../recipes.js';

Meteor.methods({
    'recipes.getRecipes': function() {
        this.unblock();
         
        let url = API + '/pylons/recipes/';  
      
        try {
            let response = HTTP.get(url); 
            let recipes = JSON.parse(response.content).Recipes;  
            
            let finishedRecipeIds = new Set(Recipes.find({ "Disabled": { $in: [true, false] } }).fetch().map((p) => p.ID));


            let activeRecipes = new Set(Recipes.find({ "Disabled": { $in: [false] } }).fetch().map((p) => p.ID));

            let recipeIds = [];
          
            if (recipes.length > 0) {

                const bulkRecipes = Recipes.rawCollection().initializeUnorderedBulkOp();
                for (let i in recipes) {
                    let recipe = recipes[i];
                    let deeplink = 'https://devwallet.pylons.tech?action=purchase_nft&recipe_id=' + recipe.ID + '&nft_amount=1';  
                    recipe.deeplink = deeplink;

                    let cookbook_rul = API + '/pylons/cookbooks/'; 
                 
                    let cookbook_response = HTTP.get(cookbook_rul);
                    var cookbook_owner = ""
                    if (cookbook_response.statusCode == 200){  
                        try {
                            let cookbooks = JSON.parse(cookbook_response.content).Cookbooks;
                            if (cookbooks.length > 0) {
                                for (let j in cookbooks) {
                                    let cookbook = cookbooks[j];
                                    if (cookbook.ID == recipe.CookbookID) {
                                        cookbook_owner = recipe.Sender;
                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            console.log(e);
                        }
                    } 
                    recipe.cookbook_owner = cookbook_owner;

                    const entries = recipe.Entries;  
                    var picWidth = 1200;
                    var picHeight = 800;
                    if (entries != null) {
                        const itemoutputs = entries.ItemOutputs; 
                        if (itemoutputs.length > 0) {
                            let strings = itemoutputs[0].Strings;
                            
                            for (i = 0; i < strings.length; i++) {
                                try {
                                    var values = strings[i].Value;
                                    if (values.indexOf('http') >= 0 && (values.indexOf('.png') > 0 || values.indexOf('.jpg') > 0)) {
                                        img = values;  
                                        var refImg = new Image();
                                        refImg.src = values;   
                                        picWidth = refImg.width;
                                        picHeight = refImg.height  
                                        break;
                                    }
                                } catch (e) {
                                    console.log('strings[i].Value', e)
                                    break;
                                }
            
                            }
                        } 
                    }    
                    recipe.width = picWidth;
                    recipe.height = picHeight; 
            
                    recipeIds.push(recipe.ID);
                    if (recipe.NO != -1 && !finishedRecipeIds.has(recipe.ID)) {
                        try {
                            let date = new Date();
                            recipe.NO = date.getFullYear() * 1000 * 360 * 24 * 30 * 12 + date.getMonth() * 1000 * 360 * 24 * 30 + date.getDay() * 1000 * 360 * 24 + date.getHours() * 1000 * 360 + date.getMinutes() * 1000 * 60 + date.getSeconds() * 1000 + date.getMilliseconds();
                            recipe.recipeId = recipe.NO;
                            if (activeRecipes.has(recipe.ID)) {
                                let validators = []
                                let page = 0;

                                // do {
                                //     url = RPC + `/validators?page=${++page}&per_page=100`;
                                //     let response = HTTP.get(url);
                                //     result = JSON.parse(response.content).result;
                                //     validators = [...validators, ...result.validators];

                                // }
                                // while (validators.length < parseInt(result.total))

                                // let activeVotingPower = 0;
                                // for (v in validators) {
                                //     activeVotingPower += parseInt(validators[v].voting_power);
                                // }
                                // recipe.activeVotingPower = activeVotingPower;

                            }
                            //Recipes.insert(recipe);
                            bulkRecipes.find({ ID: recipe.ID }).upsert().updateOne({ $set: recipe });

                        } catch (e) {
                            bulkRecipes.find({ ID: recipe.ID }).upsert().updateOne({ $set: recipe });
                        }
                    }
                }

                bulkRecipes.find({ ID: { $nin: recipeIds }, Disabled: { $nin: [true, false] } })
                    .update({ $set: { Disabled: false } });
                bulkRecipes.execute();
            }
            return recipes
        } catch (e) {
            console.log(url);
            console.log(e);
        }
    }
})