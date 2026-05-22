import fs from 'fs';
import path from 'path';

// Read API key from .env in the project root
const ENV_PATH = path.join(process.cwd(), '.env');
let LINEAR_API_KEY = '';

try {
  const envContent = fs.readFileSync(ENV_PATH, 'utf8');
  const match = envContent.match(/LINEAR_API_KEY=(.*)/);
  if (match) {
    LINEAR_API_KEY = match[1].trim();
  }
} catch (err) {
  console.error('⚠️ Could not read .env at', ENV_PATH);
}

const ISSUE_ID = process.argv[2];
if (!ISSUE_ID) {
  console.error('❌ Usage: node linear-task-investigation.mjs TEAM-123');
  process.exit(1);
}

async function fetchLinearIssue() {
  const query = `
    query GetIssue($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        state {
          name
          type
          color
        }
        assignee {
          name
          email
        }
        creator {
          name
          email
        }
        team {
          name
          key
        }
        labels {
          nodes {
            name
            color
          }
        }
        priority
        priorityLabel
        estimate
        url
        createdAt
        updatedAt
        comments {
          nodes {
            body
            user {
              name
            }
            createdAt
          }
        }
        attachments {
          nodes {
            title
            url
          }
        }
      }
    }
  `;

  try {
    console.log('🔍 Fetching Linear issue:', ISSUE_ID);
    console.log('🔑 Using API key:', LINEAR_API_KEY.substring(0, 20) + '...');
    
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { id: ISSUE_ID }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP Error Details:');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ Linear API Error:', JSON.stringify(data.errors, null, 2));
      return;
    }

    const issue = data.data?.issue;
    if (!issue) {
      console.error('❌ Issue not found:', ISSUE_ID);
      console.log('Response data:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('\n🎯 LINEAR TASK DETAILS:');
    console.log('='.repeat(60));
    console.log(`📋 ID: ${issue.identifier}`);
    console.log(`📝 Title: ${issue.title}`);
    console.log(`🔄 Status: ${issue.state.name} (${issue.state.type})`);
    console.log(`👤 Assignee: ${issue.assignee?.name || 'Unassigned'}`);
    console.log(`👨‍💼 Creator: ${issue.creator?.name}`);
    console.log(`🏢 Team: ${issue.team?.name} (${issue.team?.key})`);
    console.log(`⚡ Priority: ${issue.priorityLabel || issue.priority || 'None'}`);
    console.log(`📊 Estimate: ${issue.estimate || 'None'} points`);
    console.log(`🏷️ Labels: ${issue.labels?.nodes?.map(l => l.name).join(', ') || 'None'}`);
    console.log(`📅 Created: ${new Date(issue.createdAt).toLocaleDateString()}`);
    console.log(`📅 Updated: ${new Date(issue.updatedAt).toLocaleDateString()}`);
    console.log(`🔗 URL: ${issue.url}`);
    
    console.log('\n📝 DESCRIPTION:');
    console.log('-'.repeat(60));
    console.log(issue.description || 'No description');
    
    if (issue.comments?.nodes?.length > 0) {
      console.log('\n💬 COMMENTS:');
      console.log('-'.repeat(60));
      issue.comments.nodes.forEach((comment, index) => {
        console.log(`\n${index + 1}. 👤 ${comment.user.name} (${new Date(comment.createdAt).toLocaleDateString()}):`);
        console.log(`   📄 ${comment.body}`);
      });
    }
    
    if (issue.attachments?.nodes?.length > 0) {
      console.log('\n📎 ATTACHMENTS:');
      console.log('-'.repeat(60));
      issue.attachments.nodes.forEach((attachment) => {
        console.log(`• ${attachment.title}: ${attachment.url}`);
      });
    }

    // Return data for further analysis
    return issue;

  } catch (error) {
    console.error('❌ Error fetching Linear issue:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the task investigation
fetchLinearIssue()
  .then((issue) => {
    if (issue) {
      console.log('\n✅ Successfully fetched Linear issue data!');
      console.log('\n📊 SUMMARY FOR AI ANALYSIS:');
      console.log('Task ID:', issue.identifier);
      console.log('Task Title:', issue.title);
      console.log('Description Length:', issue.description?.length || 0, 'characters');
      console.log('Comments Count:', issue.comments?.nodes?.length || 0);
      console.log('Attachments Count:', issue.attachments?.nodes?.length || 0);
    }
  })
  .catch(console.error);
