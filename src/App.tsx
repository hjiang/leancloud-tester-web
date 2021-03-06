import React, { Component } from 'react';
import {
  Container,
  Dropdown,
  Grid,
  Menu,
  Feed,
  Icon,
  Checkbox,
  Table,
  Tab,
  Button,
  Modal
} from 'semantic-ui-react';
import { BrowserRouter as Router, Link, Switch, Route, match } from 'react-router-dom';
import styled from 'styled-components';
import moment from 'moment';

const getJSON = async (path: string) => {
  const prefix = 'https://test-us-west.leancloud.tk';
  const url = `${prefix}${path}`;
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    }
  });
  return response.json();
}

interface Downtime {
  id: number;
  startResultId: number;
  startTime: string;
  endResultId?: number;
  endTime?: string;
}

const DowntimeTable = (props: {
  downtimes: Downtime[],
  selectedResultIds: number[],
  onSelectResult: (id: number) => void
}) => {
  return (
    <Table color='red'>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>From</Table.HeaderCell>
          <Table.HeaderCell>To</Table.HeaderCell>
          <Table.HeaderCell>Duration</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {props.downtimes.map(dt => {
          return (
            <Table.Row key={dt.id}>
              <Table.Cell>
                <Checkbox label={moment(dt.startTime).local().format()}
                  checked={props.selectedResultIds.includes(dt.startResultId)}
                  onChange={(_, { checked }) => checked && props.onSelectResult(dt.startResultId)} />
              </Table.Cell>
              <Table.Cell>
                <Checkbox label={dt.endTime ? moment(dt.endTime).local().format() : 'Ongoing'}
                  checked={dt.endResultId ? props.selectedResultIds.includes(dt.endResultId) : false}
                  disabled={!dt.endResultId}
                  onChange={(_, { checked }) => checked && props.onSelectResult(dt.endResultId!)} />
              </Table.Cell>
              <Table.Cell>{dt.endTime ? moment.duration(moment(dt.startTime).diff(moment(dt.endTime))).humanize() : 'Ongoing'}</Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table>);
}

class ResultRangePopup extends Component<{ testName: string; startId: number; endId: number }> {
  state = {
    results: []
  }

  loadResults = async () => {
    this.setState({
      results: await getJSON(`/api/tests/${this.props.testName}/results/${this.props.startId}/${this.props.endId}/`)
    });
  }

  async componentDidMount() {
    await this.loadResults();
  }

  render() {
    return <ResultsFeed results={this.state.results} />
  }
}

interface DowntimePageProps {
  testName: string
}

class DowntimeTab extends Component<DowntimePageProps> {
  state = {
    downtimes: [],
    selectedResultIds: []
  }

  loadDowntimes = async () => {
    const downtimes = await getJSON(`/api/tests/${this.props.testName}/downtimes/`);
    this.setState({ downtimes });
  }
  async componentDidMount() {
    this.loadDowntimes();
  }

  componentDidUpdate(prevProps: ResultTabProps) {
    if (this.props.testName !== prevProps.testName) {
      this.loadDowntimes();
    }
  }

  onSelectResult = (id: number) => {
    const ids: number[] = this.state.selectedResultIds;
    ids.push(id);
    if (ids.length > 2) {
      ids.shift();
    }
    this.setState({ selectedResultIds: ids });
  }

  render() {
    const sortedId = Array.from(this.state.selectedResultIds).sort((a, b) => a - b);
    return (
      <Container>
        <Modal trigger={
          <Button disabled={this.state.selectedResultIds.length !== 2}>
            Show test results
          </Button>}>
          <Modal.Content>
            <ResultRangePopup testName={this.props.testName} startId={sortedId[0]}
              endId={sortedId[1]} />
          </Modal.Content>
        </Modal>

        <DowntimeTable downtimes={this.state.downtimes}
          selectedResultIds={this.state.selectedResultIds}
          onSelectResult={this.onSelectResult} />
      </Container>
    )
  }
}

const ResultsFeed = (props: { results: Result[] }) => {
  return (
    <Feed>
      {props.results.map(result => {
        return (
          <Feed.Event key={result.id}>
            <Feed.Label>
              {
                result.passed ?
                  <Icon color='green' name='thumbs up' /> :
                  <Icon color='red' name='thumbs down' />
              }
            </Feed.Label>
            <Feed.Content>
              <Feed.Summary>
                {result.passed ? 'Passed' : 'Failed'}
                <Feed.Date>
                  {moment(result.finishedAt).fromNow()}
                  - {moment(result.finishedAt).local().format()}
                </Feed.Date>
              </Feed.Summary>
              {result.info &&
                <Feed.Extra text>
                  {result.info}
                </Feed.Extra>}
            </Feed.Content>
          </Feed.Event>
        );
      })}
    </Feed>
  );
}

interface Result {
  id: number;
  passed: boolean;
  finishedAt: string;
  info?: string;
}
interface ResultTabProps {
  testName: string
}

interface ResultTabState {
  results: Result[];
  failuresOnly: boolean;
}
class ResultsTab extends Component<ResultTabProps> {
  state: ResultTabState = {
    results: [],
    failuresOnly: true
  }

  loadResults = async () => {
    if (this.state.failuresOnly) {
      this.setState({
        results: await getJSON(`/api/tests/${this.props.testName}/failures/`)
      });
    } else {
      this.setState({
        results: await getJSON(`/api/tests/${this.props.testName}/results/`)
      });
    }
  }

  async componentDidMount() {
    this.loadResults();
  }

  componentDidUpdate(prevProps: ResultTabProps) {
    if (this.props.testName !== prevProps.testName) {
      this.loadResults();
    }
  }

  toggleFailuresOnly = () => {
    this.setState({ failuresOnly: !this.state.failuresOnly }, () => {
      this.loadResults();
    });
  }

  render() {
    return (
      <Container>
        <Checkbox label='Show failures only' onChange={this.toggleFailuresOnly} checked={this.state.failuresOnly} toggle />
        <ResultsFeed results={this.state.results} />
      </Container>
    );
  }
}

const TestPage = (props: { match?: match<{ name: string }> }) => {
  const panes = [
    { menuItem: 'Results', render: () => <Tab.Pane><ResultsTab testName={props.match!.params.name} /></Tab.Pane> },
    { menuItem: 'Downtimes', render: () => <Tab.Pane><DowntimeTab testName={props.match!.params.name} /></Tab.Pane> },
  ]
  return <Container>
    <h2>{props.match!.params.name}</h2>
    <Tab panes={panes} />
  </Container>;
}

const Timestamp = styled.span`
  font-size: 0.8em;
  text-align: right;
  float: right;
  padding-top: 0.3em;
`;

interface Test {
  id: number;
  name: string;
  passed: boolean;
  updatedAt: string;
}

class TestList extends Component {
  state: { tests: Test[] } = {
    tests: []
  }

  async componentDidMount() {
    this.setState({ tests: await getJSON('/api/tests/') });
  }

  render() {
    return (
      <Grid padded>
        {this.state.tests.map((test, index) => {
          return (
            <Grid.Row color={test.passed ? 'green' : 'red'} key={index}
              as={Link} to={`/tests/${test.name}/`}>
              <Grid.Column>
                {test.name} <Timestamp>{moment(test.updatedAt).fromNow()}</Timestamp>
              </Grid.Column>
            </Grid.Row>
          );
        })}
      </Grid>
    );
  }
}

class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <Menu fixed='top' inverted>
            <Container>
              <Menu.Item as={Link} to='/' header>
                LeanCloud Tester
              </Menu.Item>

              <Dropdown item simple text='Tests'>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to='/tests/LeanStorage/'>
                    LeanStorage
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to='/tests/LeanMessage/'>
                    LeanMessage
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Container>
          </Menu>
          <Container text style={{ marginTop: '7em' }}>
            <Switch>
              <Route exact path='/' component={TestList} />
              <Route path='/tests/:name/' component={TestPage} />
            </Switch>
          </Container>
        </div>
      </Router>
    );
  }
}

export default App;
