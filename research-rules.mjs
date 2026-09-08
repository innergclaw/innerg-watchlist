export function activeResearchMember(member, now=Date.now()) {
  return member?.status === 'active' && Boolean(member.membership_number) &&
    (member.access_source === 'grandfathered' || !member.access_expires_at || Date.parse(member.access_expires_at)>now);
}
export function researchState(status) {
  return status===200?'active':status===401?'signed-out':status===403?'membership-required':'error';
}
