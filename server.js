require('dotenv').config();
const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const REDDIT_API_URL = 'https://oauth.reddit.com';
const TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';

// Function to get OAuth token
async function getRedditToken() {
	const auth = Buffer.from(
		`${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`,
	).toString('base64');
	try {
		const response = await axios.post(
			TOKEN_URL,
			qs.stringify({
				grant_type: 'password',
				username: process.env.REDDIT_USERNAME,
				password: process.env.REDDIT_PASSWORD,
			}),
			{
				headers: {
					Authorization: `Basic ${auth}`,
					'User-Agent': process.env.USER_AGENT,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			},
		);
		return response.data.access_token;
	} catch (error) {
		console.error(
			'Error fetching Reddit token:',
			error.response?.data || error.message,
		);
		return null;
	}
}

//comments
// app.get('/reddit/comments', async (req, res) => {
// 	try {
// 		// Get post ID from query params
// 		const postId = req.query.post_id;
// 		if (!postId) {
// 			return res.status(400).json({ error: 'post_id is required' });
// 		}

// 		// Reddit API URL
// 		const url = `https://www.reddit.com/comments/${postId}.json`;

// 		// Fetch Reddit comments
// 		const response = await axios.get(url, {
// 			headers: {
// 				'User-Agent': 'MyRedditFetcher/1.0 (by u/Cultural_Abalone_101)',
// 			},
// 		});

// 		// Extract comments from the response
// 		const comments = response.data[1].data.children.map((c) => c.data);

// 		// Sort by score & get top 5 comments
// 		const topComments = comments
// 			.sort((a, b) => b.score - a.score) // Sort by highest score
// 			.slice(0, 5) // Get top 5
// 			.map((c) => ({
// 				username: c.author,
// 				score: c.score,
// 				comment: c.body,
// 			}));

// 		res.json({ post_id: postId, top_comments: topComments });
// 	} catch (error) {
// 		console.error('Error fetching comments:', error.message);
// 		res.status(500).json({ error: 'Failed to fetch comments' });
// 	}
// });
app.get('/reddit/comments', async (req, res) => {
	try {
		const { post_id } = req.query;

		if (!post_id) {
			return res.status(400).json({ error: 'Post ID is required' });
		}

		// Fetch Reddit post data
		const redditUrl = `https://www.reddit.com/comments/${post_id}.json`;
		const response = await axios.get(redditUrl);
		const postData = response.data;

		if (!postData || postData.length < 2) {
			return res
				.status(500)
				.json({ error: 'Invalid response from Reddit API' });
		}

		const postTitle = postData[0].data.children[0].data.title;

		// Extract comments sorted by score
		const comments = postData[1].data.children
			.map((comment) => ({
				username: comment.data.author,
				score: comment.data.score,
				comment: comment.data.body,
			}))
			.sort((a, b) => b.score - a.score)
			.slice(0, 5); // Get top 5 comments

		return res.json({ title: postTitle, top_comments: comments });
	} catch (error) {
		console.error('Error fetching Reddit data:', error);
		res.status(500).json({ error: 'Failed to fetch Reddit data' });
	}
});
// Endpoint to fetch a Reddit post by URL
app.get('/fetch-post', async (req, res) => {
	// console.log(req.query);
	const { url } = req.query;
	if (!url) return res.status(400).json({ error: 'Post URL is required!' });

	try {
		const token = await getRedditToken();
		if (!token)
			return res.status(500).json({ error: 'Failed to get Reddit token' });

		// Convert Reddit post URL to API URL
		const apiUrl =
			url.replace('https://www.reddit.com', REDDIT_API_URL) + '.json';

		const response = await axios.get(apiUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				'User-Agent': process.env.USER_AGENT,
			},
		});

		res.json(response.data);
	} catch (error) {
		console.error(
			'Error fetching Reddit post:',
			error.response?.data || error.message,
		);
		res.status(500).json({ error: 'Failed to fetch Reddit post' });
	}
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
