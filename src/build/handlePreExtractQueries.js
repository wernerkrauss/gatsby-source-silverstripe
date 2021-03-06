const fetchTypeData = require('../fetch/fetchTypeData');
const fetchSummaryData = require('../fetch/fetchSummaryData');
const { buildFragment, exportFragment } = require('../utils/buildFragment');
const formFragment = require('../queries/formFragment');
const formFieldsFragment = require('../queries/formFieldsFragment');
const path = require('path');
const fs = require('fs-extra');
const generateArtefact = require('../utils/generateArtefact');

const handlePreExtractQueries = async ({
  store,
  getNodesByType
}) => {
  const types = await fetchTypeData();
  const dataObjectType = types.find(t => t.name === 'DataObject');
  const { fields } = dataObjectType;
  const fieldList = fields
    .filter(f => !['contentFields', 'relations'].includes(f.name))
    .map(f => f.name);
  const coreFragments = [
    buildFragment({
      baseName: 'SilverStripeDataObject',
      shortName: 'Core',
      typeName: '',
      fields: fieldList,
    })    
  ];
  const json = await fetchSummaryData(null);
  const classes = json.includedClasses.filter(c => !!c.fields.length);
  const dataobjectFragments = classes.map(classInfo => (
    buildFragment({
      ...classInfo,
      baseName: 'SilverStripeDataObject',
    })
  ));
  let formFragments = [];
  if (getNodesByType('SilverStripeForm').length) {
    formFragments = [
      exportFragment('SilverStripeFormFields', formFragment),
      exportFragment('SilverStripeFormFieldFields', formFieldsFragment)
    ];
  }

  const fragments = [
    ...coreFragments,
    ...dataobjectFragments,
    ...formFragments,
  ];
  
  const fragmentsPath = path.resolve(`src/__fragments.js`);
  const fragmentContent = `
    import { graphql } from 'gatsby';

    ${fragments.join("\n")}`;

  generateArtefact(fragmentsPath, fragmentContent);

  console.log(`Wrote ${fragments.length} fragments to ${fragmentsPath}`);  
  const program = store.getState().program;
  const CACHE_DIR = path.resolve(`${program.directory}/.cache/silverstripe/assets/`);
  await fs.ensureDir(CACHE_DIR);

  if (getNodesByType(`SilverStripeFile`).length == 0) {
    return;
  }

  let gatsbyImageDoesNotExist = true;

  try {
    require.resolve(`gatsby-image`);

    gatsbyImageDoesNotExist = false;
  } catch (e) {// Ignore
  }

  if (gatsbyImageDoesNotExist) {
    return;
  } // We have both gatsby-image installed as well as ImageSharp nodes so let's
  // add our fragments to .cache/fragments.


  await fs.copy(
    require.resolve(`gatsby-source-silverstripe/fragments.js`),
    `${program.directory}/.cache/fragments/silverstripe-asset-fragments.js`
  );
};

module.exports = handlePreExtractQueries;
