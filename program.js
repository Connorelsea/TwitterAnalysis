import Twitter from "twitter";
import TwitterAccount from "./twitter_account.js";

var client = new Twitter(TwitterAccount);

const getStatus = (id, callback) => {
	client.get("statuses/show", { id }, callback);
}

const search = (res, callback, name, since_id,  max_id) => {

	if ("Attempting search...")

	if (max_id) {
		console.log("Firing search with max_id");
		client.get(
			"search/tweets",
			{ q : "@" + name, count: 100, max_id },
			callback
		);
	}

	else {
		console.log("Firing search without max_id");
		client.get(
			"search/tweets",
			{ q : "@" + name, count: 100 },
			callback
		);
	}



}

const getRepliesTo = (id, process_callback) => {

	getStatus(id, (err, res, raw) => {

		if (err) console.log(err);

		let info = {
			name: res.user.screen_name,
			replies: [],
			id_buffer: [],
			since_id: id,
			max_id: "",
			stop: false
		}

		let search_callback = (err, res, raw) => {

			if (err) console.log("HAS ERROR: " + JSON.stringify(err));
			else handleRes(err, res);

			if (info.stop === false) {
				search(
					res,
					search_callback, 
					info.name,
					info.since_id,
					info.max_id
				);
			} else {
				
			}
		}

		let handleRes = (err, res) => {

			const tweets = res.statuses
				.map((tweet) => {

					// In order to find the lowest ID, add the IDs
					// of all incoming tweets to the ID buffer.
					info.id_buffer.push(tweet.id_str);

					return {
						id: id,
						text: tweet.text,
						reply_id : tweet.in_reply_to_status_id_str,
						user: tweet.user.screen_name,
						retweets: tweet.retweet_count,
						favorites: tweet.favorite_count
					}
				})
				.filter((tweet) => {
					// Return if tweet is reply to tweet we are
					// processing and if it's ID is greater than
					// the overall since_id, indicating that this
					// tweet is within the realm of our search.
					if (tweet.id < info.since_id) {
						console.log("Tweet out of range. Stopping loop.");
						info.stop = true;
					} else {
						if (tweet.reply_id === id) {
							console.log("Found Reply: " + JSON.stringify(tweet, null, 4));
							return tweet;
						}
					}
				})

			// Add replies found on this iteration to the
			// array of replies found from previous iterations
			info.replies = info.replies.concat(tweets);

			// Find the smallest ID in the ID buffer. Set this
			// as the maximum ID of the next query. The next query
			// will then get the 100 tweets before this max ID.
			info.max_id = info.id_buffer.sort()[0];
			info.id_buffer = [];

			if (info.max_id < info.since_id) {
				info.stop = true;
				
				// Call process callback
				process_callback(info);
			}
		}

		// Start the recursive search. Pattern recurses inside
		// of search_callback.
		search(res, search_callback, info.name, info.since_id);

	})

}

getRepliesTo("680226147213426688", (info) => {
	let replies = info.replies;
	let words   = [];
	let groups  = [];
	let final_groups = [];

	let tuples = [];

	let words_to_remove = [
		"is", "the", "to", "@floydophone", "with", "and", "i", "a",
		"of", "it", "", "for", "but", "that", "not", "all", "it\'s",
		"are", "more", "you", "because", "other", "my", "in", "them",
		"if", "just", "would", "get", "think", "than", "you\'re", "than",
		"an", "on", "too", "about"
	]

	var word_arr = replies.map(reply => { return tokenize(reply.text) })

	word_arr.forEach(arr => words = words.concat(arr))

	words = words.filter(word => {
		if (!words_to_remove.contains(word)) return word;
	})

	// Count totals of each word

	words.forEach((word) => {

		if (!groups[word]) {
			groups[word] = 1;
		} else {
			groups[word] = groups[word] + 1;
		}

	})

	// Move associative array contents into tuples
	// for easy sorting.

	for (var key in groups) {
		if (groups.hasOwnProperty(key)) {

			if (groups[key] > 2) {
				tuples.push([key, groups[key]])
			}

		}
	}

	// Sort array to get most used words

	tuples.sort((a, b) => {
	    a = a[1];
	    b = b[1];

	    return a < b ? -1 : (a > b ? 1 : 0);
	});

	// Display most used words

	tuples.forEach(tuple => console.log(`${tuple[0]}: ${tuple[1]}`))

	// Display sections of the data that may be important

	let tool_count    = groups["tool"] + groups["tools"] + groups["tooling"];
	let ux_count      = groups["redux"] + groups["flux"];
	let complex_count = groups["complex"] + groups["complexity"] +
						groups["hard"] + groups["difficult"]

	console.log("\nHighlighted Sections: \n")
	console.log(`(Tool(s) + Tooling): ${tool_count}`);
	console.log(`(Redux + Flux): ${ux_count}`)
	console.log(`(Webpack): ${groups["webpack"]}`)
	console.log(`(Babel): ${groups["babel"]}`)
	console.log(`(Complex Synonyms): ${complex_count}`)
});

const tokenize = (str) => {

	str = str
			.replace(/[.,-\/#!$%\^&\*\";:{}=\-_`~()]/g, " ")
			.toLowerCase()

	return str.split(" ");
}

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}