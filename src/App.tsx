import React, { Component } from 'react';
import {
  Container,
  Divider,
  Dropdown,
  Grid,
  Header,
  Image,
  List,
  Menu,
  Feed,
  Icon,
} from 'semantic-ui-react';
import { BrowserRouter as Router, Link, Switch, Route, match } from 'react-router-dom';
import styled from 'styled-components';
import moment from 'moment';

const getJSON = async (url: string) => {
  const response = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    }
  });
  return response.json();
}

interface Result {
  id: number;
  passed: boolean;
  finishedAt: string;
  info?: string;
}
interface ResultListProps {
  match?: match<{ name: string }>
}
class ResultList extends Component<ResultListProps> {
  state: { results: Result[] } = {
    results: []
  }

  async componentDidMount() {
    this.setState({ results: await getJSON(`/api/tests/${this.props.match!.params.name}/results/`) });
  }

  render() {
    return (
      <Container>
        <h2>LeanStorage</h2>
        <Feed>
          {this.state.results.map(result => {
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
                    { result.passed ? 'Passed' : 'Failed' }
                  <Feed.Date>{moment(result.finishedAt).fromNow()}</Feed.Date>
                  </Feed.Summary>
                  { result.info &&
                  <Feed.Extra text>
                    { result.info }
                  </Feed.Extra> }
                </Feed.Content>
              </Feed.Event>
            );
          })}

        </Feed>
      </Container>
    );
  }
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
              <Menu.Item as='a' header>
                LeanCloud Tester
              </Menu.Item>

              <Dropdown item simple text='Tests'>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to='/'>
                    All
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Container>
          </Menu>
          <Container text style={{ marginTop: '7em' }}>
            <Switch>
              <Route exact path='/' component={TestList} />
              <Route path='/tests/:name/' component={ResultList} />
            </Switch>
          </Container>
        </div>
      </Router>
    );
  }
}

export default App;
