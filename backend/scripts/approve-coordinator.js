import dotenv from 'dotenv';
import pool from '../config/db.js';
import {
  approveByEmail,
  listCoordinators
} from '../services/coordinatorService.js';

dotenv.config();

const args = process.argv.slice(2);
const email = (args[0] || '').trim().toLowerCase();
const wantsList = args.includes('--list');

const printUsage = () => {
  console.log('Usage:');
  console.log('  npm run approve -- <college-email>   Approve a pending coordinator');
  console.log('  npm run approve -- --list            List all coordinator accounts');
  console.log('  npm run approve -- --pending         List only pending accounts');
};

const main = async () => {
  if (wantsList || args.includes('--pending')) {
    const status = args.includes('--pending') ? 'pending' : null;
    const coordinators = await listCoordinators(status);

    if (coordinators.length === 0) {
      console.log(status ? 'No pending coordinator accounts.' : 'No coordinator accounts found.');
      return;
    }

    console.log('ID | Full Name | Email | Designation | Status');
    for (const c of coordinators) {
      console.log(`${c.id} | ${c.full_name} | ${c.email} | ${c.designation} | ${c.status}`);
    }
    return;
  }

  if (!email) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const approved = await approveByEmail(email);
  if (!approved) {
    console.error(`No coordinator account found for ${email}.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Approved coordinator: ${approved.full_name} <${approved.email}> (${approved.designation}).`);
  console.log('The account can now log in and manage events.');
};

try {
  await main();
} catch (err) {
  console.error('Approval command failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
