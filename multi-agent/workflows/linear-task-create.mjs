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
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const MODE = args[0]; // 'clone' or 'create'

async function cloneTask(sourceId) {
  console.log(`🔄 Cloning Linear task: ${sourceId}`);
  
  // First, fetch the source task
  const fetchQuery = `
    query GetIssue($id: String!) {
      issue(id: $id) {
        id
        identifier
        title
        description
        team {
          id
          key
        }
        labels {
          nodes {
            id
            name
          }
        }
        state {
          id
          name
        }
        priority
        assignee {
          id
        }
      }
    }
  `;

  try {
    const fetchResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: fetchQuery,
        variables: { id: sourceId }
      })
    });

    const fetchData = await fetchResponse.json();
    
    if (fetchData.errors) {
      console.error('❌ Error fetching source task:', JSON.stringify(fetchData.errors, null, 2));
      return;
    }

    const sourceIssue = fetchData.data?.issue;
    if (!sourceIssue) {
      console.error('❌ Source issue not found:', sourceId);
      return;
    }

    console.log(`✅ Found source task: ${sourceIssue.identifier} - ${sourceIssue.title}`);
    
    // Create new task based on source
    const createMutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `;

    const input = {
      teamId: sourceIssue.team.id,
      title: `[CLONED] ${sourceIssue.title}`,
      description: `**Cloned from ${sourceIssue.identifier}**\n\n${sourceIssue.description || 'No description'}`,
    };

    // Add labels if present
    if (sourceIssue.labels?.nodes?.length > 0) {
      input.labelIds = sourceIssue.labels.nodes.map(l => l.id);
    }

    // Add priority if present
    if (sourceIssue.priority) {
      input.priority = sourceIssue.priority;
    }

    const createResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: createMutation,
        variables: { input }
      })
    });

    const createData = await createResponse.json();
    
    if (createData.errors) {
      console.error('❌ Error creating task:', JSON.stringify(createData.errors, null, 2));
      return;
    }

    const newIssue = createData.data?.issueCreate?.issue;
    if (newIssue) {
      console.log('\n✅ Successfully created Linear task!');
      console.log(`📋 ID: ${newIssue.identifier}`);
      console.log(`📝 Title: ${newIssue.title}`);
      console.log(`🔗 URL: ${newIssue.url}`);
      
      // Output for agent parsing
      console.log(`\n🤖 AGENT_OUTPUT: ${newIssue.identifier}`);
    }

  } catch (error) {
    console.error('❌ Error in clone operation:', error);
  }
}

async function createTask(teamKey, title, description) {
  console.log(`📝 Creating new Linear task in team: ${teamKey}`);
  
  // First, get team ID from key
  const teamQuery = `
    query GetTeams {
      teams {
        nodes {
          id
          key
          name
        }
      }
    }
  `;

  try {
    const teamResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({ query: teamQuery })
    });

    const teamData = await teamResponse.json();
    
    if (teamData.errors) {
      console.error('❌ Error fetching teams:', JSON.stringify(teamData.errors, null, 2));
      return;
    }

    const teams = teamData.data?.teams?.nodes || [];
    const team = teams.find(t => t.key === teamKey);
    
    if (!team) {
      console.error(`❌ Team not found: ${teamKey}`);
      console.log('Available teams:', teams.map(t => t.key).join(', '));
      return;
    }

    console.log(`✅ Found team: ${team.name} (${team.key})`);

    // Create the task
    const createMutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `;

    const input = {
      teamId: team.id,
      title: title,
      description: description || '',
    };

    const createResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: createMutation,
        variables: { input }
      })
    });

    const createData = await createResponse.json();
    
    if (createData.errors) {
      console.error('❌ Error creating task:', JSON.stringify(createData.errors, null, 2));
      return;
    }

    const newIssue = createData.data?.issueCreate?.issue;
    if (newIssue) {
      console.log('\n✅ Successfully created Linear task!');
      console.log(`📋 ID: ${newIssue.identifier}`);
      console.log(`📝 Title: ${newIssue.title}`);
      console.log(`🔗 URL: ${newIssue.url}`);
      
      // Output for agent parsing
      console.log(`\n🤖 AGENT_OUTPUT: ${newIssue.identifier}`);
    }

  } catch (error) {
    console.error('❌ Error in create operation:', error);
  }
}

async function updateTask(issueId, updates) {
  console.log(`🔄 Updating Linear task: ${issueId}`);
  
  // First, fetch current task to show what will be changed
  // Support both UUID and identifier (e.g., CYC-6)
  const fetchQuery = `
    query GetIssue($filter: IssueFilter!) {
      issues(filter: $filter, first: 1) {
        nodes {
          id
          identifier
          title
          description
          url
        }
      }
    }
  `;

  try {
    const fetchResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: fetchQuery,
        variables: { 
          filter: { 
            id: { eq: issueId }
          } 
        }
      })
    });

    const fetchData = await fetchResponse.json();
    
    if (fetchData.errors) {
      console.error('❌ Error fetching task:', JSON.stringify(fetchData.errors, null, 2));
      return;
    }

    const issues = fetchData.data?.issues?.nodes || [];
    let currentIssue = issues[0];
    
    // If not found by UUID, try by identifier
    if (!currentIssue) {
      const identifierQuery = `
        query GetIssueByIdentifier($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            url
          }
        }
      `;
      
      const identifierResponse = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': LINEAR_API_KEY,
        },
        body: JSON.stringify({
          query: identifierQuery,
          variables: { id: issueId }
        })
      });
      
      const identifierData = await identifierResponse.json();
      currentIssue = identifierData.data?.issue;
    }
    
    if (!currentIssue) {
      console.error('❌ Issue not found:', issueId);
      return;
    }

    console.log(`✅ Found task: ${currentIssue.identifier} - ${currentIssue.title}`);
    console.log(`🔍 DEBUG - currentIssue.id: "${currentIssue.id}"`);
    
    if (!currentIssue.id) {
      console.error('❌ ERROR: currentIssue.id is undefined/null!');
      console.error('Full object:', JSON.stringify(currentIssue, null, 2));
      return;
    }
    
    // Build update input from provided updates object
    const input = { id: currentIssue.id };
    
    if (updates.title) {
      input.title = updates.title;
      console.log(`📝 Updating title: "${currentIssue.title}" → "${updates.title}"`);
    }
    
    if (updates.description !== undefined) {
      input.description = updates.description;
      console.log(`📄 Updating description (${updates.description.length} chars)`);
    }
    
    // Extract id from input - Linear API requires it as a separate argument
    const issueUuid = input.id;
    delete input.id;

    // Update the task
    // NOTE: Linear API requires id as a separate argument, not inside input
    const updateMutation = `
      mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            url
          }
        }
      }
    `;
    
    console.log('🔍 DEBUG - Mutation variables:', JSON.stringify({ id: issueUuid, input }, null, 2));

    const updateResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': LINEAR_API_KEY,
      },
      body: JSON.stringify({
        query: updateMutation,
        variables: { id: issueUuid, input }
      })
    });

    const updateData = await updateResponse.json();
    
    if (updateData.errors) {
      console.error('❌ Error updating task:', JSON.stringify(updateData.errors, null, 2));
      return;
    }

    const updatedIssue = updateData.data?.issueUpdate?.issue;
    if (updatedIssue) {
      console.log('\n✅ Successfully updated Linear task!');
      console.log(`📋 ID: ${updatedIssue.identifier}`);
      console.log(`📝 Title: ${updatedIssue.title}`);
      console.log(`🔗 URL: ${updatedIssue.url}`);
      
      // Output for agent parsing
      console.log(`\n🤖 AGENT_OUTPUT: ${updatedIssue.identifier}`);
    }

  } catch (error) {
    console.error('❌ Error in update operation:', error);
  }
}

// Main execution
if (MODE === 'clone') {
  if (!args[1]) {
    console.error('Usage: node linear-task-create.mjs clone SOURCE_ID');
    process.exit(1);
  }
  cloneTask(args[1]);
} else if (MODE === 'create') {
  if (!args[1] || !args[2]) {
    console.error('Usage: node linear-task-create.mjs create TEAM_KEY "Title" "Description"');
    process.exit(1);
  }
  const teamKey = args[1];
  const title = args[2];
  const description = args[3] || '';
  createTask(teamKey, title, description);
} else if (MODE === 'update') {
  if (!args[1]) {
    console.error('Usage: node linear-task-create.mjs update ISSUE_ID [--title "New Title"] [--description "New Description"]');
    process.exit(1);
  }
  
  const issueId = args[1];
  const updates = {};
  
  // Parse update flags
  for (let i = 2; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      updates.title = args[i + 1];
      i++;
    } else if (args[i] === '--description' && args[i + 1]) {
      updates.description = args[i + 1];
      i++;
    }
  }
  
  if (Object.keys(updates).length === 0) {
    console.error('❌ No updates specified. Use --title and/or --description flags.');
    console.log('\nExample:');
    console.log('  node linear-task-create.mjs update TEAM-123 --title "New title" --description "New description"');
    process.exit(1);
  }
  
  updateTask(issueId, updates);
} else {
  console.error('❌ Invalid mode. Use "clone", "create", or "update"');
  console.log('\nExamples:');
  console.log('  Clone task:   node linear-task-create.mjs clone TEAM-123');
  console.log('  Create task:  node linear-task-create.mjs create TEAM "Fix bug" "Description here"');
  console.log('  Update task:  node linear-task-create.mjs update TEAM-123 --title "New title" --description "New description"');
  process.exit(1);
}
